"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Residente } from "@/types/residente";
import { terminarSessao } from "@/lib/auth";

interface HeaderProps {
  residente?: Residente | null;
}

export default function Header({ residente }: HeaderProps) {
  const router = useRouter();

  async function sair() {
    await terminarSessao();
    router.push("/");
    router.refresh();
  }

  const fotoPerfil =
    residente?.fotoPerfilBase64 ||
    residente?.fotoPerfil ||
    "/img/usercard.jpg";

  return (
    <header className="site-header">
      <div className="header-container">
        <Link href="/" className="logo" aria-label="Página inicial">
          <Image
            src="/img/CVR-dash.jpg"
            alt="logo="
            className="logo-img"
            width={280}
            height={80}/>
        </Link>



        <div className="nav-ctas">
          {!residente ? (
            <>
              <Link href="/login" className="btn btn-primary">
                Login
              </Link>

              <Link href="/registo" className="btn btn-primary">
                Criar conta
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                className="conta-residente"
                onClick={() => router.push("/dashboard")}
              >
                <img
                  src={fotoPerfil}
                  alt={`Foto de ${residente.nome}`}
                  className="header-foto-perfil"
                />

                <span>
                  <small>Minha conta</small>
                  <strong>
                    {residente.nome?.split(" ")[0] || residente.username}
                  </strong>
                </span>
              </button>

              <button type="button" className="btn btn-primary" onClick={sair}>
                Sair
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}