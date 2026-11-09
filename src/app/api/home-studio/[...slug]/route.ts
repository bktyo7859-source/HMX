import { NextRequest, NextResponse } from "next/server";
import {
  buildClearCookieHeader,
  HomeStudioHttpError,
  homeStudioServerDb,
  SESSION_COOKIE_NAME,
} from "@/lib/home-studio/serverAuthAndDb";

function extractToken(req: NextRequest): string | null {
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

async function handleRequest(
  req: NextRequest,
  context: { params: { slug: string[] } }
): Promise<NextResponse> {
  const slug = context.params?.slug || [];
  const path = "/" + slug.join("/");
  const method = req.method.toUpperCase();

  try {
    // 1. Database Health Check
    if (method === "GET" && path === "/health/db") {
      const health = homeStudioServerDb.checkHealth();
      return NextResponse.json(health, {
        status: health.status === "healthy" ? 200 : 503,
      });
    }

    // 2. Authentication Endpoints
    if (method === "POST" && path === "/auth/register") {
      const body = await req.json();
      const result = homeStudioServerDb.registerUser({
        email: body.email,
        password: body.password,
        fullName: body.fullName,
        organization: body.organization,
        preferredUnit: body.preferredUnit,
        defaultCity: body.defaultCity,
        clientIp: getClientIp(req),
      });
      const res = NextResponse.json(
        {
          authenticated: true,
          user: result.user,
          sessionToken: result.sessionToken,
        },
        { status: 201 }
      );
      res.headers.set("Set-Cookie", result.cookieHeader);
      return res;
    }

    if (method === "POST" && path === "/auth/login") {
      const body = await req.json();
      const result = homeStudioServerDb.loginUser({
        email: body.email,
        password: body.password,
        clientIp: getClientIp(req),
      });
      const res = NextResponse.json({
        authenticated: true,
        user: result.user,
        sessionToken: result.sessionToken,
      });
      res.headers.set("Set-Cookie", result.cookieHeader);
      return res;
    }

    if (method === "POST" && path === "/auth/logout") {
      const res = NextResponse.json({
        authenticated: false,
        message: "Signed out of HMX Home Studio.",
      });
      res.headers.set("Set-Cookie", buildClearCookieHeader());
      return res;
    }

    // All remaining endpoints require server-side authentication (never trusting X-HMX-Owner-Id)
    const token = extractToken(req);
    const user = homeStudioServerDb.authenticateTokenOrThrow(token);

    if (method === "GET" && path === "/auth/me") {
      return NextResponse.json({
        authenticated: true,
        user,
      });
    }

    // 3. Projects Collection
    if (method === "GET" && path === "/projects") {
      const projects = homeStudioServerDb.listProjects(user.id);
      return NextResponse.json({
        projects,
        count: projects.length,
      });
    }

    if (method === "POST" && path === "/projects") {
      const body = await req.json();
      const created = homeStudioServerDb.createProject(
        user.id,
        body.project,
        body.changeSummary,
        body.assumptions,
        body.estimateSnapshot
      );
      return NextResponse.json(created, { status: 201 });
    }

    if (method === "POST" && path === "/projects/import-local") {
      const body = await req.json();
      const result = homeStudioServerDb.importLocalProjects(
        user.id,
        Array.isArray(body.projects) ? body.projects : []
      );
      return NextResponse.json(result);
    }

    // 4. Single Project Operations (/projects/:projectId)
    if (slug[0] === "projects" && slug[1] && slug.length === 2) {
      const projectId = decodeURIComponent(slug[1]);

      if (method === "GET") {
        const found = homeStudioServerDb.getProject(user.id, projectId);
        return NextResponse.json(found);
      }

      if (method === "PUT") {
        const body = await req.json();
        const updated = homeStudioServerDb.updateProject(
          user.id,
          projectId,
          body.project,
          {
            expectedVersion: body.expectedVersion,
            changeSummary: body.changeSummary,
            assumptions: body.assumptions,
            estimateSnapshot: body.estimateSnapshot,
          }
        );
        return NextResponse.json(updated);
      }

      if (method === "DELETE") {
        const deleted = homeStudioServerDb.deleteProject(user.id, projectId);
        return NextResponse.json(deleted);
      }
    }

    // 5. Project Duplication (/projects/:projectId/duplicate)
    if (
      slug[0] === "projects" &&
      slug[1] &&
      slug[2] === "duplicate" &&
      method === "POST"
    ) {
      const projectId = decodeURIComponent(slug[1]);
      const duplicated = homeStudioServerDb.duplicateProject(
        user.id,
        projectId
      );
      return NextResponse.json(duplicated, { status: 201 });
    }

    // 6. Project Versions (/projects/:projectId/versions)
    if (
      slug[0] === "projects" &&
      slug[1] &&
      slug[2] === "versions" &&
      slug.length === 3 &&
      method === "GET"
    ) {
      const projectId = decodeURIComponent(slug[1]);
      const versions = homeStudioServerDb.listProjectVersions(
        user.id,
        projectId
      );
      return NextResponse.json({ projectId, versions });
    }

    // 7. Restore Version (/projects/:projectId/versions/:versionNumber/restore)
    if (
      slug[0] === "projects" &&
      slug[1] &&
      slug[2] === "versions" &&
      slug[3] &&
      slug[4] === "restore" &&
      method === "POST"
    ) {
      const projectId = decodeURIComponent(slug[1]);
      const versionNumber = Number(slug[3]);
      const restored = homeStudioServerDb.restoreProjectVersion(
        user.id,
        projectId,
        versionNumber
      );
      return NextResponse.json(restored);
    }

    // 8. Report Metadata (/projects/:projectId/reports)
    if (
      slug[0] === "projects" &&
      slug[1] &&
      slug[2] === "reports" &&
      slug.length === 3
    ) {
      const projectId = decodeURIComponent(slug[1]);
      if (method === "GET") {
        const reports = homeStudioServerDb.listProjectReports(
          user.id,
          projectId
        );
        return NextResponse.json({ projectId, reports });
      }
      if (method === "POST") {
        const body = await req.json();
        const created = homeStudioServerDb.createReportMetadata(
          user.id,
          projectId,
          body
        );
        return NextResponse.json(created, { status: 201 });
      }
    }

    return NextResponse.json(
      { detail: `Route ${method} ${path} not found.` },
      { status: 404 }
    );
  } catch (err) {
    if (err instanceof HomeStudioHttpError) {
      return NextResponse.json(
        {
          detail: err.message,
          ...(err.details || {}),
        },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { detail: "Internal server error processing Home Studio request." },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: { slug: string[] } }
) {
  return handleRequest(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: { slug: string[] } }
) {
  return handleRequest(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: { slug: string[] } }
) {
  return handleRequest(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: { slug: string[] } }
) {
  return handleRequest(req, context);
}

