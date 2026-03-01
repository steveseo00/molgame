import { NextResponse } from "next/server";

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(code: number, message: string) {
  return NextResponse.json({ error: { code, message } }, { status: code });
}
