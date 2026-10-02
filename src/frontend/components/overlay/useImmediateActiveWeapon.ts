import { useRef } from 'react';

function getWeaponIdentity(weapon: any) {
  return `${String(weapon?.name || '')}:${String(weapon?.type || '')}`;
}

/**
 * O CS2 pode manter a arma anterior e a nova como "active" durante um pacote
 * de transicao. Nesse caso, o item diferente do ultimo exibido e o que acabou
 * de ser selecionado e deve aparecer imediatamente na HUD.
 */
export function useImmediateActiveWeapon(weaponCollection: unknown) {
  const previousActiveWeaponRef = useRef('');
  const weapons = Object.values<any>(weaponCollection || {});
  const activeWeapons = weapons.filter((weapon) => {
    const state = String(weapon?.state || '').toLowerCase();
    return state === 'active' || state.startsWith('reload');
  });

  let activeWeapon: any = null;

  if (activeWeapons.length === 1) {
    [activeWeapon] = activeWeapons;
  } else if (activeWeapons.length > 1) {
    activeWeapon = activeWeapons.find(
      (weapon) => getWeaponIdentity(weapon) !== previousActiveWeaponRef.current,
    ) || activeWeapons.at(-1) || null;
  } else if (previousActiveWeaponRef.current) {
    // Durante a recarga o CS2 pode enviar um pacote sem nenhum item marcado
    // como ativo. Mantemos a ultima arma enquanto ela ainda existir no
    // inventario, evitando o piscar/sumico do icone.
    activeWeapon = weapons.find(
      (weapon) => getWeaponIdentity(weapon) === previousActiveWeaponRef.current,
    ) || null;
  }

  if (activeWeapon) {
    previousActiveWeaponRef.current = getWeaponIdentity(activeWeapon);
  }

  return { weapons, activeWeapon };
}
