export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white m-0">Visão Geral</h1>
        <p className="text-neutral-400 mt-2">Bem-vindo ao DoutrinaHUD. Aqui você controla todo o fluxo da transmissão.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-neutral-400 font-medium text-sm">Partidas Ativas</h3>
          <p className="text-4xl font-bold text-white mt-2">0</p>
        </div>
        <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-neutral-400 font-medium text-sm">Times Cadastrados</h3>
          <p className="text-4xl font-bold text-white mt-2">0</p>
        </div>
        <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-neutral-400 font-medium text-sm">Jogadores</h3>
          <p className="text-4xl font-bold text-white mt-2">0</p>
        </div>
      </div>
    </div>
  );
}
