import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyLoginCredentials,
} from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let username = "";
    let password = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body && typeof body === "object") {
        username =
          typeof body.username === "string" ? body.username.trim() : "";
        password =
          typeof body.password === "string" ? body.password.trim() : "";
      }
    } else {
      const formData = await req.formData();
      username = String(formData.get("username") ?? "").trim();
      password = String(formData.get("password") ?? "").trim();
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const ok = verifyLoginCredentials(username, password);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = await createSessionToken();

    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("POST /api/login error", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

