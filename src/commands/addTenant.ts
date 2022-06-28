import * as vscode from 'vscode';
import * as commands from './constants';
import { SailPointIdentityNowAuthenticationProvider } from '../services/AuthenticationProvider';
import { TenantService } from '../services/TenantService';
import { isEmpty } from '../utils';
import { askDisplayName } from '../utils/vsCodeHelpers';


export class AddTenantCommand {

    constructor(private readonly tenantService: TenantService) { }

    async askTenant(): Promise<string | undefined> {
        const result = await vscode.window.showInputBox({
            value: '',
            ignoreFocusOut: true,
            placeHolder: 'company or company.identitynow.com',
            prompt: "Enter the tenant name",
            title: 'IdentityNow',
            validateInput: text => {
                // regexr.com/6jk1u
                const regex = new RegExp('^([a-z0-9][a-z0-9\-]+[a-z0-9]\.[a-z0-9][a-z0-9\-]+[a-z0-9]\.)?([a-z0-9][a-z0-9\-]+[a-z0-9])$', 'i');
                if (regex.test(text)) {
                    return null;
                }
                return "Invalid tenant name";
            }
        });
        return result;
    }


    async execute(context: vscode.ExtensionContext): Promise<void> {

        let tenantName = await this.askTenant() || "";
        if (isEmpty(tenantName)) {
            return;
        }

        let displayName = await askDisplayName(tenantName) || "";
        displayName = displayName.trim();
        if (isEmpty(displayName)) {
            return;
        }

        tenantName = tenantName.toLowerCase();
        const tenantId = require('crypto').randomUUID().replaceAll('-', '');
        this.tenantService.setTenant({
            id: tenantId,
            name: displayName,
            tenantName: tenantName
        });
        let session: vscode.AuthenticationSession;
        try {
            session = await vscode.authentication.getSession(SailPointIdentityNowAuthenticationProvider.id, [tenantId], { createIfNone: true });
            if (session !== undefined && !isEmpty(session.accessToken)) {
                await vscode.commands.executeCommand(commands.REFRESH);
                await vscode.window.showInformationMessage(`Tenant ${displayName} added!`);
            } else {
                this.tenantService.removeTenant(tenantId);
            }
        } catch (err: any) {
            console.error(err);
            this.tenantService.removeTenant(tenantId);
            vscode.window.showErrorMessage(err.message);
        }
    }
}
