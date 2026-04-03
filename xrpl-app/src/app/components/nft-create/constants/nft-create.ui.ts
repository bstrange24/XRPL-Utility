import { AppConstants } from '../../../core/app.constants';
import { NftCreateConfigTxDisplayType } from './nft-create.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const NFT_CREATE_TABS: {
     key: NftCreateConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createNft',
          label: 'Mint NFT',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'burnNft',
          label: 'Burn NFT',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'updateNFTMetadata',
          label: 'Update NFT',
          icon: 'heroArrowPath',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const NFT_CREATE_TAB_META: Record<
     NftCreateConfigTxDisplayType,
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
     createNft: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Mint NFT',
          desc: 'Mint a new NFT for the selected account.',
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     burnNft: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Burn NFT',
          desc: 'Burn an existing NFT for the selected account.',
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     updateNFTMetadata: {
          icon: 'heroArrowPath',
          colorClass: 'white-button-submenu',
          title: 'Update NFT Metadata',
          desc: `Update the metadata of an existing NFT.`,
          color: 'green',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
