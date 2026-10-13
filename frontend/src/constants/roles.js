export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  OPERATOR: 'OPERATOR',
  TAILOR: 'TAILOR',
};

export const ROLE_LABELS = {
  [ROLES.SUPERADMIN]: 'Superadmin',
  [ROLES.OPERATOR]: 'Operator',
  [ROLES.TAILOR]: 'Tikuv sexi',
};

// Har bir rol login qilgandan keyin tushadigan bosh sahifa
export const ROLE_HOME = {
  [ROLES.SUPERADMIN]: '/superadmin',
  [ROLES.OPERATOR]: '/operator',
  [ROLES.TAILOR]: '/tailor',
};
