export function formatWeaponName(name: string) {
  if (!name) return '';
  const clean = name.replace('weapon_', '');
  
  const map: Record<string, string> = {
    // Rifles
    'm4a1_silencer': 'M4A1-S',
    'm4a1': 'M4A4',
    'ak47': 'AK-47',
    'awp': 'AWP',
    'deagle': 'Desert Eagle',
    'galilar': 'Galil AR',
    'famas': 'FAMAS',
    'sg556': 'SG 553',
    'aug': 'AUG',
    'ssg08': 'SSG 08',
    'g3sg1': 'G3SG1',
    'scar20': 'SCAR-20',
    
    // SMGs
    'mac10': 'MAC-10',
    'mp9': 'MP9',
    'mp7': 'MP7',
    'mp5sd': 'MP5-SD',
    'ump45': 'UMP-45',
    'p90': 'P90',
    'bizon': 'PP-Bizon',
    
    // Heavy
    'nova': 'Nova',
    'xm1014': 'XM1014',
    'mag7': 'MAG-7',
    'sawedoff': 'Sawed-Off',
    'm249': 'M249',
    'negev': 'Negev',
    
    // Pistols
    'p250': 'P250',
    'fiveseven': 'Five-SeveN',
    'tec9': 'Tec-9',
    'cz75a': 'CZ75-Auto',
    'elite': 'Dual Berettas',
    'revolver': 'R8 Revolver',
    'hkp2000': 'P2000',
    'glock': 'Glock-18',
    'usp_silencer': 'USP-S',
    
    // Knives
    'knife': 'Knife',
    'knifegg': 'Golden Knife',
    'knife_t': 'Knife',
    'knife_karambit': 'Karambit',
    'knife_butterfly': 'Butterfly Knife',
    'knife_m9_bayonet': 'M9 Bayonet',
    'bayonet': 'Bayonet',
    'knife_flip': 'Flip Knife',
    'knife_gut': 'Gut Knife',
    'knife_falchion': 'Falchion Knife',
    'knife_tactical': 'Huntsman Knife',
    'knife_survival_bowie': 'Bowie Knife',
    'knife_bowie': 'Bowie Knife',
    'knife_canis': 'Survival Knife',
    'knife_cord': 'Paracord Knife',
    'knife_css': 'Classic Knife',
    'knife_gypsy_jackknife': 'Navaja Knife',
    'knife_outdoor': 'Nomad Knife',
    'knife_push': 'Shadow Daggers',
    'knife_skeleton': 'Skeleton Knife',
    'knife_stiletto': 'Stiletto Knife',
    'knife_ursus': 'Ursus Knife',
    'knife_widowmaker': 'Talon Knife',
    'knife_kukri': 'Kukri Knife',
    'knife_twinblade': 'Twinblade',
    
    // Utilities
    'incgrenade': 'Incendiary',
    'molotov': 'Molotov',
    'smokegrenade': 'Smoke',
    'flashbang': 'Flashbang',
    'hegrenade': 'HE Grenade',
    'decoy': 'Decoy',
    'c4': 'C4',
    'taser': 'Zeus x27'
  };

  return map[clean] || clean.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function getWeaponIcon(name: string) {
  if (!name) return '';
  const clean = name.replace('weapon_', '');
  
  // Specific mappings for icons that might have different names
  const iconMap: Record<string, string> = {
    'm4a1_silencer': 'm4a1_silencer',
    'm4a1': 'm4a1',
    'incgrenade': 'incgrenade',
    'molotov': 'molotov',
    'smokegrenade': 'smokegrenade',
    'flashbang': 'flashbang',
    'hegrenade': 'hegrenade',
    'decoy': 'decoy',
    'c4': 'c4',
    'taser': 'taser'
  };

  if (clean.startsWith('knife') || clean.includes('bayonet')) {
    return `/icons/cs2/${clean}.svg`;
  }

  const iconName = iconMap[clean] || clean;
  return `/icons/cs2/${iconName}.svg`;
}
