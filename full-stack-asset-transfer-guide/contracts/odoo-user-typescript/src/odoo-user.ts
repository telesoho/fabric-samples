import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

@Info({title: 'OdooUser', description: 'Smart contract for odoo user'})
export class OdooUserContract extends Contract {

    @Transaction(false)
    @Returns('Object')
    ClientAccountInfo(ctx: Context) {
        return {
            id: ctx.clientIdentity.getID(),
            role: ctx.clientIdentity.getAttributeValue("role")
        };
    }
}

