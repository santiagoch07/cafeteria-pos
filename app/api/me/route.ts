import { getUsuarioActual } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    return NextResponse.json(null, { status: 401 });
  }
  return NextResponse.json(usuario);
}
