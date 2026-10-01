// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const ACTIVE_MAP_POOL = [
  'Ancient',
  'Anubis',
  'Dust2',
  'Inferno',
  'Mirage',
  'Nuke',
  'Overpass',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

function getServiceKey() {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');

  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      if (parsed.default) return String(parsed.default);
    } catch (error) {
      console.warn('SUPABASE_SECRET_KEYS nao pode ser interpretado:', error);
    }
  }

  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}

const serviceKey = getServiceKey();
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function randomToken(byteLength = 24) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function generateFlow(format: 'BO1' | 'BO3') {
  if (format === 'BO1') {
    return [
      { step: 1, teamSide: 'left', action: 'ban', amount: 1, label: '{leftTeam} bane 1 mapa' },
      { step: 2, teamSide: 'right', action: 'ban', amount: 2, label: '{rightTeam} bane 2 mapas' },
      { step: 3, teamSide: 'left', action: 'ban', amount: 2, label: '{leftTeam} bane 2 mapas' },
      { step: 4, teamSide: 'right', action: 'pick', mapNumber: 1, sideChoiceBy: 'left', label: '{rightTeam} escolhe o mapa da partida' },
      { step: 5, teamSide: 'left', action: 'side_choice', mapNumber: 1, label: '{leftTeam} escolhe o lado inicial' },
    ];
  }

  return [
    { step: 1, teamSide: 'left', action: 'ban', label: '{leftTeam} bane 1 mapa' },
    { step: 2, teamSide: 'right', action: 'ban', label: '{rightTeam} bane 1 mapa' },
    { step: 3, teamSide: 'left', action: 'pick', mapNumber: 1, sideChoiceBy: 'left', label: '{leftTeam} escolhe o Mapa 1' },
    { step: 4, teamSide: 'left', action: 'side_choice', mapNumber: 1, label: '{leftTeam} escolhe o lado do Mapa 1' },
    { step: 5, teamSide: 'right', action: 'pick', mapNumber: 2, sideChoiceBy: 'right', label: '{rightTeam} escolhe o Mapa 2' },
    { step: 6, teamSide: 'right', action: 'side_choice', mapNumber: 2, label: '{rightTeam} escolhe o lado do Mapa 2' },
    { step: 7, teamSide: 'left', action: 'ban', label: '{leftTeam} bane 1 mapa' },
    { step: 8, teamSide: 'right', action: 'ban', label: '{rightTeam} bane 1 mapa' },
    { step: 9, teamSide: null, action: 'decider', mapNumber: 3, sideChoiceBy: 'knife', label: 'Mapa restante e o Decisor' },
  ];
}

function updateCurrentTurn(state: any) {
  const currentStep = state.flow[state.currentStepIndex];
  if (!currentStep || state.status !== 'live') {
    state.currentTurn = null;
    return;
  }

  if (currentStep.teamSide === 'random') {
    state.currentTurn = Math.random() < 0.5 ? 'left' : 'right';
    return;
  }

  state.currentTurn = currentStep.teamSide;
}

function finishVeto(state: any) {
  state.status = 'finished';
  state.isFinished = true;
  state.currentTurn = null;
}

function checkAutomaticSteps(state: any) {
  if (state.currentStepIndex >= state.flow.length) {
    finishVeto(state);
    return;
  }

  const currentStep = state.flow[state.currentStepIndex];
  if (currentStep.action !== 'decider') {
    updateCurrentTurn(state);
    return;
  }

  const deciderMap = state.availableMaps[0];
  if (!deciderMap) {
    finishVeto(state);
    return;
  }

  state.actions.push({
    id: crypto.randomUUID(),
    stepIndex: state.currentStepIndex,
    action: 'decider',
    teamSide: null,
    mapName: deciderMap,
    mapNumber: currentStep.mapNumber,
    sideChoiceBy: currentStep.sideChoiceBy,
    timestamp: Date.now(),
  });
  state.selectedMaps.push({
    mapName: deciderMap,
    mapNumber: currentStep.mapNumber,
    pickedBy: 'decider',
    sideChoiceBy: currentStep.sideChoiceBy || 'knife',
    startingSide: null,
  });
  state.availableMaps = [];
  state.currentStepIndex += 1;
  checkAutomaticSteps(state);
}

function publicAssetUrl(path: string | null) {
  if (!path) return '';
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${supabaseUrl}/storage/v1/object/public/doutrinahud-assets/${encodedPath}`;
}

function safeTeam(team: any) {
  return {
    id: team.id,
    name: team.name,
    tag: team.tag || '',
    logo: publicAssetUrl(team.logo_path),
    country: team.country || '',
    color: team.color || '',
  };
}

async function optionalUser(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user || null;
}

async function loadLiveSession(publicId: string) {
  const { data, error } = await admin
    .from('live_sessions')
    .select('id, public_id, workspace_id, status, expires_at')
    .eq('public_id', publicId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function canManage(userId: string | undefined, workspaceId: string) {
  if (!userId) return false;
  const { data, error } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .in('role', ['owner', 'editor'])
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function loadVeto(liveSessionId: string) {
  const { data, error } = await admin
    .from('live_veto_sessions')
    .select('id, left_token_hash, right_token_hash, state')
    .eq('live_session_id', liveSessionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function tokenSide(row: any, token: string) {
  if (!row || !token) return null;
  const hash = await sha256Hex(token);
  if (safeEqual(hash, row.left_token_hash)) return 'left';
  if (safeEqual(hash, row.right_token_hash)) return 'right';
  return null;
}

async function saveState(rowId: string, state: any) {
  const { error } = await admin
    .from('live_veto_sessions')
    .update({ state })
    .eq('id', rowId);
  if (error) throw error;
}

async function broadcastState(publicId: string, state: any) {
  const topic = `live:${publicId}`;
  const url = `${supabaseUrl}/realtime/v1/api/broadcast/${encodeURIComponent(topic)}/events/${encodeURIComponent('veto:update')}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(state),
  });

  if (!response.ok) {
    console.warn('Realtime recusou atualizacao do veto:', response.status, await response.text());
  }
}

function clientState(state: any, viewerSide: string | null = null) {
  return viewerSide ? { ...state, viewerSide } : state;
}

function fail(message: string, status = 400) {
  return jsonResponse({ success: false, error: message }, status);
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') return fail('Metodo nao permitido.', 405);
  if (!supabaseUrl || !serviceKey) return fail('Funcao nao configurada.', 500);

  try {
    const body = await request.json();
    const event = String(body?.event || '');
    const payload = body?.payload || {};
    const matchId = String(payload.matchId || '').trim();
    if (!matchId) return fail('Sessao ao vivo nao informada.');

    const liveSession = await loadLiveSession(matchId);
    if (!liveSession) return fail('Sessao ao vivo expirada ou inexistente.', 404);

    const user = await optionalUser(request);
    const isManager = await canManage(user?.id, liveSession.workspace_id);

    if (event === 'veto:create') {
      if (!isManager) return fail('Voce nao tem permissao para criar o veto.', 403);

      const format = payload.format === 'BO1' ? 'BO1' : 'BO3';
      const leftTeamId = Number(payload.leftTeam?.id);
      const rightTeamId = Number(payload.rightTeam?.id);
      if (!leftTeamId || !rightTeamId || leftTeamId === rightTeamId) {
        return fail('Selecione dois times diferentes antes de criar o veto.');
      }

      const { data: teamRows, error: teamsError } = await admin
        .from('teams')
        .select('id, name, tag, logo_path, country, color')
        .eq('workspace_id', liveSession.workspace_id)
        .in('id', [leftTeamId, rightTeamId]);
      if (teamsError) throw teamsError;

      const leftTeam = teamRows?.find((team) => Number(team.id) === leftTeamId);
      const rightTeam = teamRows?.find((team) => Number(team.id) === rightTeamId);
      if (!leftTeam || !rightTeam) return fail('Um dos times nao pertence ao seu workspace.', 403);

      const leftToken = randomToken();
      const rightToken = randomToken();
      const state = {
        matchId,
        status: 'waiting',
        format,
        leftTeam: safeTeam(leftTeam),
        rightTeam: safeTeam(rightTeam),
        leftReady: false,
        rightReady: false,
        leftConnected: false,
        rightConnected: false,
        activeMapPool: [...ACTIVE_MAP_POOL],
        flow: generateFlow(format),
        currentStepIndex: 0,
        availableMaps: [...ACTIVE_MAP_POOL],
        actions: [],
        selectedMaps: [],
        currentTurn: null,
        isFinished: false,
      };

      const { error } = await admin.from('live_veto_sessions').upsert({
        live_session_id: liveSession.id,
        workspace_id: liveSession.workspace_id,
        created_by: user.id,
        left_token_hash: await sha256Hex(leftToken),
        right_token_hash: await sha256Hex(rightToken),
        state,
      }, { onConflict: 'live_session_id' });
      if (error) throw error;

      await broadcastState(matchId, state);
      return jsonResponse({
        success: true,
        state: { ...state, leftToken, rightToken },
        tokens: { leftToken, rightToken },
      });
    }

    const row = await loadVeto(liveSession.id);
    if (!row) {
      if (event === 'veto:get_status') {
        return jsonResponse({ success: true, state: null });
      }
      return fail('Nenhuma sessao de veto foi criada.', 404);
    }

    const token = String(payload.token || '');
    const viewerSide = await tokenSide(row, token);

    if (event === 'veto:get_status') {
      return jsonResponse({ success: true, state: clientState(row.state, viewerSide) });
    }

    if (event === 'veto:delete') {
      if (!isManager) return fail('Voce nao tem permissao para excluir o veto.', 403);
      const { error } = await admin.from('live_veto_sessions').delete().eq('id', row.id);
      if (error) throw error;
      await broadcastState(matchId, null);
      return jsonResponse({ success: true, state: null });
    }

    const state = structuredClone(row.state);

    if (event === 'veto:reset') {
      if (!isManager) return fail('Voce nao tem permissao para resetar o veto.', 403);
      state.status = 'waiting';
      state.leftReady = false;
      state.rightReady = false;
      state.currentStepIndex = 0;
      state.availableMaps = [...ACTIVE_MAP_POOL];
      state.actions = [];
      state.selectedMaps = [];
      state.currentTurn = null;
      state.isFinished = false;
    } else if (event === 'veto:start') {
      if (!isManager) return fail('Voce nao tem permissao para iniciar o veto.', 403);
      if (!['setup', 'waiting'].includes(state.status)) return fail('O veto nao pode ser iniciado neste estado.');
      state.status = 'live';
      state.currentStepIndex = 0;
      updateCurrentTurn(state);
      checkAutomaticSteps(state);
    } else if (event === 'veto:join') {
      if (!viewerSide) return fail('Link de capitao invalido.', 403);
      state[viewerSide === 'left' ? 'leftConnected' : 'rightConnected'] = true;
    } else if (event === 'veto:captain_ready') {
      if (!viewerSide) return fail('Link de capitao invalido.', 403);
      state[viewerSide === 'left' ? 'leftReady' : 'rightReady'] = Boolean(payload.ready);
      state.status = state.leftReady && state.rightReady ? 'setup' : 'waiting';
    } else if (event === 'veto:submit_action') {
      if (!viewerSide) return fail('Link de capitao invalido.', 403);
      if (state.status !== 'live') return fail('O veto ainda nao foi iniciado.');

      const currentStep = state.flow[state.currentStepIndex];
      if (!currentStep || !['ban', 'pick'].includes(currentStep.action)) {
        return fail('Esta etapa nao aceita escolha de mapas.');
      }
      if (state.currentTurn !== viewerSide) return fail('Ainda nao e a vez do seu time.');

      const mapNames = Array.isArray(payload.mapNames)
        ? payload.mapNames.map(String).filter((map) => state.availableMaps.includes(map))
        : [];
      const required = currentStep.action === 'ban' ? currentStep.amount || 1 : 1;
      if (mapNames.length !== required || new Set(mapNames).size !== mapNames.length) {
        return fail(`Selecione exatamente ${required} mapa(s) disponivel(is).`);
      }

      const action: any = {
        id: crypto.randomUUID(),
        stepIndex: state.currentStepIndex,
        action: currentStep.action,
        teamSide: viewerSide,
        timestamp: Date.now(),
      };

      if (currentStep.action === 'ban') {
        action.mapNames = mapNames;
      } else {
        action.mapName = mapNames[0];
        action.mapNumber = currentStep.mapNumber;
        action.sideChoiceBy = currentStep.sideChoiceBy;
        state.selectedMaps.push({
          mapName: mapNames[0],
          mapNumber: currentStep.mapNumber,
          pickedBy: viewerSide,
          sideChoiceBy: currentStep.sideChoiceBy,
          startingSide: null,
        });
      }

      state.actions.push(action);
      state.availableMaps = state.availableMaps.filter((map) => !mapNames.includes(map));
      state.currentStepIndex += 1;
      updateCurrentTurn(state);
      checkAutomaticSteps(state);
    } else if (event === 'veto:submit_side_choice') {
      if (!viewerSide) return fail('Link de capitao invalido.', 403);
      if (state.status !== 'live') return fail('O veto ainda nao foi iniciado.');

      const currentStep = state.flow[state.currentStepIndex];
      const startingSide = payload.startingSide === 'CT' ? 'CT' : payload.startingSide === 'TR' ? 'TR' : null;
      if (!currentStep || currentStep.action !== 'side_choice' || !startingSide) {
        return fail('Escolha de lado invalida.');
      }
      if (state.currentTurn !== viewerSide) return fail('Ainda nao e a vez do seu time.');

      const mapNumber = currentStep.mapNumber || 1;
      state.actions.push({
        id: crypto.randomUUID(),
        stepIndex: state.currentStepIndex,
        action: 'side_choice',
        teamSide: viewerSide,
        startingSide,
        mapNumber,
        timestamp: Date.now(),
      });
      const selectedMap = state.selectedMaps.find((map) => Number(map.mapNumber) === Number(mapNumber));
      if (selectedMap) selectedMap.startingSide = startingSide;
      state.currentStepIndex += 1;
      updateCurrentTurn(state);
      checkAutomaticSteps(state);
    } else {
      return fail('Operacao de veto desconhecida.', 400);
    }

    await saveState(row.id, state);
    await broadcastState(matchId, state);
    return jsonResponse({ success: true, state: clientState(state, viewerSide) });
  } catch (error) {
    console.error('Falha na API de veto:', error);

    if (error?.code === '42P01') {
      return fail('A tabela do veto online ainda nao foi instalada no banco.', 503);
    }

    return fail(error?.message || 'Erro inesperado no sistema de veto.', 500);
  }
});
