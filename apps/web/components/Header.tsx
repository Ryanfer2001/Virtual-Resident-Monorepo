"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Residente } from "@/types/residente";
import { terminarSessao, atualizarResidenteGuardado } from "@/lib/auth";
import FotoPerfilMenu from "@/components/FotoPerfilMenu";

interface HeaderProps {
  residente?: Residente | null;
}

export default function Header({ residente }: HeaderProps) {
  const router = useRouter();

  const [residenteLocal, setResidenteLocal] = useState(residente);
  const [residenteAnterior, setResidenteAnterior] = useState(residente);

  if (residente !== residenteAnterior) {
    setResidenteAnterior(residente);
    setResidenteLocal(residente);
  }

  async function sair() {
    await terminarSessao();
    router.push("/");
    router.refresh();
  }

  function aoAtualizarFoto(residenteAtualizado: Residente) {
    setResidenteLocal(residenteAtualizado);
    atualizarResidenteGuardado(residenteAtualizado);
  }

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
          {!residenteLocal ? (
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
              <div className="conta-residente">
                <FotoPerfilMenu
                  residente={residenteLocal}
                  onFotoAtualizada={aoAtualizarFoto}
                />

                <button
                  type="button"
                  className="conta-residente-info"
                  onClick={() => router.push("/dashboard")}
                >
                  <span>
                    <small>Minha conta</small>
                    <strong>
                      {residenteLocal.nome?.split(" ")[0] ||
                        residenteLocal.username}
                    </strong>
                  </span>
                </button>
              </div>

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