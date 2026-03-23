
#include "hookapi.h"

int64_t hook(uint32_t reserved) {
    if (otxn_type() != ttPAYMENT)
        return accept(0, "Not payment");

    int64_t cred_len = otxn_field(NULL, sfCredentialIDs);

    if (cred_len <= 0) {
        rollback(0, "Missing CredentialIDs");
    }

    return accept(0, "OK");
}