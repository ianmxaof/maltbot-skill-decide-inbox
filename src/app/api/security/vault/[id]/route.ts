import { NextRequest, NextResponse } from "next/server";
import { getVault } from "@/lib/security/credential-vault";

/**
 * DELETE /api/security/vault/[id]
 * Delete a credential by id.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vault = getVault();
    const deleted = vault.delete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Vault not initialized")
    ) {
      return NextResponse.json(
        { error: "Vault not initialized" },
        { status: 503 }
      );
    }
    console.error("[API] security/vault/[id] DELETE:", error);
    return NextResponse.json(
      { error: "Failed to delete credential" },
      { status: 500 }
    );
  }
}
