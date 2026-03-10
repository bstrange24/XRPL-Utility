export interface XrplFieldSchema {
     name: string;
     label: string;
     required: boolean;
     description?: string;
     example?: string;
}

export interface XrplRequirement {
     label: string;
     description: string;
}

export interface XrplWarning {
     message: string;
}

export interface XrplExample {
     title: string;
     code: any;
}

export interface XrplTxSchema {
     txType: string;
     title: string;
     overview: string;
     requirements?: XrplRequirement[];
     warnings?: XrplWarning[];
     fields: XrplFieldSchema[];
     example?: XrplExample;
}
