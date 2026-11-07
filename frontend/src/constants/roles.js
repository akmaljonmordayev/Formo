export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  TAILOR: 'TAILOR',
};

export const ROLE_LABELS = {
  [ROLES.SUPERADMIN]: 'Superadmin',
  [ROLES.TAILOR]: 'Tikuv sexi',
};

// Har bir rol login qilgandan keyin tushadigan bosh sahifa
export const ROLE_HOME = {
  [ROLES.SUPERADMIN]: '/superadmin',
  [ROLES.TAILOR]: '/tailor',
};
