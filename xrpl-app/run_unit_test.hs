To run unit test and coverage for the enitre app execute this from a terminal.
ng test --code-coverage

The below commands are to run individual test for a particular file.
////////////////// App Component //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/app.component.spec.ts

////////////////// Account Balance Changes //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-balance-changes/account-balance-changes.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-balance-changes/ui-components/account-changes-filters/account-changes-filters.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-balance-changes/ui-components/account-changes-summary/account-changes-summary.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-balance-changes/ui-components/account-changes-table/account-changes-table.component.spec.ts

////////////////// Account Configurator //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-configurator/account-configurator.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-configurator/constants/account-configurator.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-configurator/constants/account-configurator.flags.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-configurator/constants/account-configurator.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-configurator/ui-components/account-configurator-requirements-info/account-configurator-requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-configurator/ui-components/summary/account-configurator-summary.component.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-configurator/ui-components/tabs/deposit-auth/deposit-auth.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-configurator/ui-components/tabs/flags/account-flags.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-configurator/ui-components/tabs/meta-data/account-metadata.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-configurator/ui-components/tabs/multi-sgn/multi-sign.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-configurator/ui-components/tabs/regular-key/regular-key.component.spec.ts

////////////////// Account Delete //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-delete/account-delete.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-delete/constants/account-delete.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-delete/constants/account-delete.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-delete/ui-components/summary/account-delete-summary.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-delete/tab/account-delete-form/account-delete-form.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/account-delete/ui-components/account-delete-requirements-info/account-delete-requirements-info.component.spec.ts

////////////////// AMM //////////////////

	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/amm/constants/amm.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/amm/constants/amm.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/amm/ui-components/amm-requirements-info/amm-requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/amm/amm.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/amm/tab/amm-fields/amm-fields.component.spec.ts

////////////////// Checks //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/checks/checks.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/checks/ui-components/checks-summary/checks-summary.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/checks/checks-requirement-info/checks-requirement-info.component.spec.ts

	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/checks/tab/check-cancel-item/check-cancel-item.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/checks/tab/check-cash-item/check-cash-item.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/checks/tab/check-create-item/check-create-item.component.spec.ts

	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/checks/tab/checks-cancel/checks-cancel.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/checks/tab/checks-cash/checks-cash.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/checks/tab/checks-create/checks-create.component.spec.ts

	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/checks/constants/checks.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/checks/constants/checks.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/checks/checks-transaction-view-model/checks-transaction-view-model.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/checks/checks-util/check-util.service.spec.ts

////////////////// Escrows //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/conditional-escrow/conditional-escrow.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/time-based-escrow/time-based-escrow.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/ui-components/escrow-requirements-info/escrow-requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/ui-components/escrow-summary/escrow-summary.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/escrow-base/escrow-base.component.spec.ts

	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/tab/escrow-cancel-item/escrow-cancel-item.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/tab/escrow-create-item/escrow-create-item.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/tab/escrow-finish-item/escrow-finish-item.component.spec.ts

	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/tab/escrows-cancel/escrows-cancel.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/tab/escrows-create/escrows-create.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/tab/escrows-finish/escrows-finish.component.spec.ts
	

	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/constants/time-escrow.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/escrow/constants/time-escrow.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/escrow/escrow-transaction-builder/escrow-transaction-builder.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/escrow/escrow-store/escrow-store.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/escrow/escrow-util/escrow-util.service.spec.ts
	
////////////////// CREDENTIALS //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/credentials/credentials.component.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/credentials/tab/credential-accept/credential-accept.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/credentials/tab/credential-create/credential-create.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/credentials/tab/credential-delete/credential-delete.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/credentials/tab/credential-verify/credential-verify.component.spec.ts

	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/credentials/ui-components/summary/credentials-summary.component.spec.ts

	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/credentials/constants/credential.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/credentials/constants/credential.ui.spec.ts
	

////////////////// DID //////////////////

	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/did/did.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/did/constants/did.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/did/constants/did.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/did/ui-components/summary/did-summary.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/did/ui-components/requirements-info/requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/did/did-util/did-util.service.spec.ts

////////////////// Delegate //////////////////	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/delegate/delegate-store/delegate-store.service.spec.ts
	
	
////////////////// MPT //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/mpt/mpt.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/mpt/constants/mpt.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/mpt/constants/mpt.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/mpt/tab/mpt-authorize-unauthorize/mpt-authorize-unauthorize.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/mpt/tab/mpt-clawback/mpt-clawback.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/mpt/tab/mpt-create/mpt-create.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/mpt/tab/mpt-destroy/mpt-destroy.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/mpt/tab/mpt-flags/mpt-flags.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/mpt/tab/mpt-lock-unlock/mpt-lock-unlock.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/mpt/tab/mpt-send/mpt-send.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/mpt/ui-components/summary/summary.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/mpt/ui-components/mpt-requirements-info/mpt-requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/mpt/mpt-store/mpt-store.service.spec.ts

////////////////// NFT Create //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-create/nft-create.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-create/constants/nft-create.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-create/constants/nft-create.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-create/tab/nft-burn/nft-burn.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-create/tab/nft-create-fields/nft-create-fields.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-create/tab/nft-flags/nft-flags.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-create/tab/nft-modify/nft-modify.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-create/ui-components/nft-requirements-info/nft-requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-create/ui-components/nft-create-summary/nft-create-summary.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/nft/nft-store/nft-store.service.spec.ts

////////////////// NFT Offers //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-offers/nft-offers.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-offers/constants/nft-offers.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-offers/constants/nft-offers.ui.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-offers/tab/nft-buy-offers/nft-buy-offers.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-offers/tab/nft-cancel-offers/nft-cancel-offers.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-offers/tab/nft-sell/nft-sell.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-offers/tab/nft-sell-offers/nft-sell-offers.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/nft-offers/ui-components/nft-offers-requirements-info/nft-offers-requirements-info.component.spec.ts

////////////////// Offers //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/offer/offer.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/offer/constants/offer.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/offer/constants/offer.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/offer/tab/cancel-offer/cancel-offer.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/offer/tab/create-offer/create-offer.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/offer/tab/offer-fields/offer-fields.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/offer/tab/get-order-book/get-order-book.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/offer/ui-components/offer-requirements-info/offer-requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/offer/ui-components/offer-summary/offer-summary.component.spec.ts

////////////////// Payment Channel //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/payment-channel/payment-channel.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/payment-channel/constants/payment-channel.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/payment-channel/constants/payment-channel.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/payment-channel/tab/payment-channel-claim/payment-channel-claim.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/payment-channel/tab/payment-channel-close/payment-channel-close.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/payment-channel/tab/payment-channel-flags/payment-channel-flags.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/payment-channel/tab/payment-channel-create/payment-channel-create.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/payment-channel/tab/payment-channel-fund/payment-channel-fund.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/payment-channel/tab/payment-channel-create/payment-channel-create.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/payment-channel/tab/payment-channel-renew/payment-channel-renew.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/payment-channel/ui-components/payment-channel-requirements-info/payment-channel-requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/payment-channel/ui-components/payment-channel-summary/payment-channel-summary.component.spec.ts																	  
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/payment-channel/payment-channel-store/payment-channel-store.service.spec.ts

////////////////// Permissioned Domain //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/permissioned-domain/permissioned-domain.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/permissioned-domain/constants/permissioned-domain.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/permissioned-domain/constants/permissioned-domain.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/permissioned-domain/ui-components/requirements-info/requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/permissioned-domain/tab/permission-domain-delete-form/permission-domain-delete-form.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/permissioned-domain/tab/permission-domain-set-form/permission-domain-set-form.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/permissioned-domain/ui-components/summary/permissioned-domains-summary.component.spec.ts																		      
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service.spec.ts
	
////////////////// Send XRP //////////////////
npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/send-xrp/send-xrp.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/send-xrp/constants/send-xrp.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/send-xrp/constants/send-xrp.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/send-xrp/ui-components/send-xrp-requirements-info/send-xrp-requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/send-xrp/ui-components/summary/send-xrp-summary.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/send-xrp/tab/send-xrp-form/send-xrp-form.component.spec.ts

////////////////// Sign Tx //////////////////

	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/sign-transactions/constants/sign-transaction.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/sign-transactions/constants/sign-transaction.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/sign-transactions/ui-components/sign-transaction-requirements-info/sign-transaction-requirements-info.component.spec.ts																      
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/sign-transactions/sign-transaction-store/sign-transation-store.service.spec.ts
	
////////////////// Tickets //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/tickets/tickets.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/tickets/constants/tickets.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/tickets/constants/tickets.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/tickets/tabs/tickets-delete/tickets-delete.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/tickets/ui-components/tickets-requirements-info/tickets-requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/tickets/ui-components/summary/tickets-summary.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/tickets/tickets-store/tickets-store.service.spec.ts

////////////////// Trustlines //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/trustlines/trustlines.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/trustlines/constants/trustline.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/trustlines/constants/trustline.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/trustlines/tab/trustline-issuers/trustline-issuers.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/trustlines/ui-components/trustline-requirements-info/trustline-requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/trustlines/tab/trustline-clawback/trustline-clawback.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/trustlines/tab/trustline-flags/trustline-flags.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/trustlines/tab/trustline-issue/trustline-issue.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/trustlines/ui-components/summary/summary.component.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/trustlines/ui-components/trustline-requirements-info/trustline-requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/trustlines/trustline-store/trustline-store.service.spec.ts

////////////////// Wallet Generator-Configurator //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/wallet-configurator/wallet-configurator.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/wallet-configurator/constants/wallet-generator.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/wallet-configurator/constants/wallet-generator.ui.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/wallet-configurator/ui-components/wallet-generator-requirements-info/wallet-generator-requirements-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/wallet-configurator/tab/wallet-derive-mnemonic/wallet-derive-mnemonic.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/wallet-configurator/tab/wallet-derive-secret-numbers/wallet-derive-secret-numbers.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/wallet-configurator/tab/wallet-derive-seed/wallet-derive-seed.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/wallet-configurator/tab/wallet-generate/wallet-generate.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/wallet-configurator/tab/wallet-remove-custom-wallet/wallet-remove-custom-wallet.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src	/app/components/wallet-panel/wallet-panel.component.spec.ts
	
////////////////// Wallet Service //////////////////	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/wallets/manager/wallet-manager.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/wallets/refresh-wallet/refresh-wallets.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/wallets/wallet-configurator-orchestrator/wallet-configurator-orchestrator.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/wallets/wallets-util/wallets-util.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/wallets/walletDestinationBase.spec.ts

////////////////// Shared //////////////////

	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/flag-selector/flag-selector.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/currency-form-section/currency-form-section.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/currency-amount-form/currency-amount-form.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/connection-status/connection-status.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/json-editor/json-editor.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/performance-base/performance-base.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/tooltip-link/tooltip-link.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/transaction-options/transaction-options.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/transaction-options-section/transaction-options-section.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/transaction-preview/transaction-preview.component.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/stores/ledger.store.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/stores/wallet.store.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/stores/xrpl-tx-options.store.spec.ts

////////////////// Shared - Ui Components //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/ui-components/navbar/navbar.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/ui-components/select-search-dropdown/select-search-dropdown.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/ui-components/summary/summary-container/summary-container.component.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/ui-components/summary/summary-key-value/summary-key-value.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/ui-components/summary/summary-item/summary-item.component.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/ui-components/warning-message/warning-message.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/ui-components/tab-with-menu/tab-with-info.component.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/components/shared/xrpl-expiration-input/xrpl-expiration-input.component.spec.ts

////////////////// Services //////////////////
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/transaction-dropdown/transaction-dropdown.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/transaction-environment/tx-environment.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/transaction-optional-fields/transaction-optional-fields.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/transaction-ui/transaction-ui.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-balance-changes/account-changes-orchestrator/account-changes-orchestrator.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-balance-changes/account-changes-store/account-changes-store.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-balance-changes/account-changes-view-model/account-changes-view-model.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-configurator/account-configurator-orchestrator/account-configurator-orchestrator.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-configurator/account-configurator-store/account-configurator-store.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-configurator/account-configurator-transaction-builder/account-configurator-transaction-builder.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-configurator/account-configurator-view-model/account-configurator-view-model.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-configurator/account-configurator-util/account-configurator-util.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-data/acccount-data.service.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-delete/account-delete-store/account-delete-store.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-delete/account-delete-transaction-builder/account-delete-transaction-builder.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-delete/account-delete-orchestrator/account-delete-orchestrator.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-delete/account-delete-util/account-delete-util.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/account-delete/account-delete-view-model/account-delete-view-model.service.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/amm/amm-store/amm-store.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/amm/amm-transaction-orchestrator/amm-transaction-orchestrator.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/amm/amm-transaction-builder/amm-transaction-builder.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/amm/amm-transaction-view-model/amm-transaction-view-model.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/amm/amm-utils/amm-utils.service.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/checks/checks-store/checks-store.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/checks/checks-transaction-builder/checks-transaction-builder.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/checks/checks-transaction-orchestrator/checks-transaction.-orchestrator.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/checks/checks-transaction-view-model/checks-transaction-view-model.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/checks/checks-util/check-util.service.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/credentials/credential-store/credential-store.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/credentials/credential-transaction-builder/credential-transaction-builder.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/credentials/credential-transaction-orchestrator/credential-transaction-orchestrator.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/credentials/credential-util/credential-util.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/credentials/credential-view-model/credential-view-model.service.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/did/did-store/did-store.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/did/did-transaction-builder/did-transaction-builder.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/did/did-transaction-orchestrator/did-transaction-orchestrator.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/did/did-util/did-util.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/did/did-view-model/did-view-model.service.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/currency/currency-store/currency-store.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/currency/currency-dropdown/currency-dropdown.service.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/offer/offer-store/offer-store.service.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/wallets/wallets-store/wallets-store.service.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/shared/account-objects-store/account-objects-store.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/shared/navbar/navbar-store.service.spec.ts
	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/utils/toast/toast.service.spec.ts
	
	
	
////////////////// Utils //////////////////	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/services/utils/validation/transaction-validation-rule.service.spec.ts
	
	


////////////////// Core //////////////////	
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/core/app.constants.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/core/xrpl-date.service.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/core/xrpl-tx-registry.spec.ts
	npm test -- --watch=false --browsers=ChromeHeadless --code-coverage --include src/app/core/xrpl-tx-schema.model.spec.ts
	
	
