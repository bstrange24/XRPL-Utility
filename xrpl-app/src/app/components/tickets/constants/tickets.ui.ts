import { AppConstants } from '../../../core/app.constants';
import { TicketConfigTxDisplayType } from './tickets.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const TICKET_TABS: {
     key: TicketConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createTicket',
          label: 'Create',
          icon: 'heroTicket',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'deleteTicket',
          label: 'Delete',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const TICKET_TAB_META: Record<
     TicketConfigTxDisplayType,
     {
          icon: string;
          colorClass: string;
          title: string;
          desc: string;
          color: string;
          iconType: IconType;
          iconSize: string;
     }
> = {
     createTicket: {
          icon: 'heroTicket',
          colorClass: 'blue-button-submenu',
          title: 'Create Ticket',
          desc: 'Create Ticket to another XRPL address.',
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     deleteTicket: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete Ticket',
          desc: 'Delete Ticket to another XRPL address.',
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
