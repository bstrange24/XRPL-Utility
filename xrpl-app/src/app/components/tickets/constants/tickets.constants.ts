export const TICKET_TAB = ['createTicket', 'deleteTicket'] as const;
export type TicketTab = (typeof TICKET_TAB)[number];

export const TICKET_TX_TYPE_MAP = {
     create: 'CreateTicket',
     delete: 'DeleteTicket',
} as const;

export const TICKET_TX_TYPES = {
     CREATE: 'createTicket',
     DELETE: 'deleteTicket',
} as const;

export const TICKET_CONFIG_TX_DISPLAY_TYPES = {
     CREATE: 'createTicket',
     DELETE: 'deleteTicket',
} as const;

export type TicketTxType = (typeof TICKET_TX_TYPES)[keyof typeof TICKET_TX_TYPES];
export type TicketConfigTxDisplayType = (typeof TICKET_CONFIG_TX_DISPLAY_TYPES)[keyof typeof TICKET_CONFIG_TX_DISPLAY_TYPES];

export const TICKET_VALIDATION_RULES: Record<TicketTxType, string> = {
     [TICKET_TX_TYPES.CREATE]: 'CreateTicket',
     [TICKET_TX_TYPES.DELETE]: 'DeleteTicket',
} as const;
