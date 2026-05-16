const fs = require('fs');
const content = fs.readFileSync('c:/Pages/HT DISTRIBUIDORA DEL BAJIO/api/HTLogistics.Api/Controllers/AppController.cs', 'utf8');

const methods = [];
// This regex matches attributes, access modifiers, return types, method name, and opening brace
const regex = /(?:\[.*?\]\s*)*(?:public|private)\s+(?:async\s+)?(?:Task<IActionResult>|string)\s+(\w+)\s*\(.*?\)\s*\{/g;

let match;
while ((match = regex.exec(content)) !== null) {
    let braceCount = 1;
    let i = match.index + match[0].length;
    while (i < content.length && braceCount > 0) {
        if (content[i] === '{') braceCount++;
        else if (content[i] === '}') braceCount--;
        i++;
    }
    methods.push({
        name: match[1],
        code: content.substring(match.index, i),
        start: match.index,
        end: i
    });
}

console.log('Found', methods.length, 'methods');
methods.forEach(m => console.log(' - ' + m.name));

const getImportsAndClassStart = (className) => `using HTLogistics.Api.Data;
using HTLogistics.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.IO;

namespace HTLogistics.Api.Controllers;

[ApiController]
[Route("api/app")]
[Authorize]
public class ${className} : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public ${className}(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

`;

const writeController = (name, methodNames) => {
    let code = getImportsAndClassStart(name);
    if(methodNames.includes('SaveImage')) {
        const sm = methods.find(m => m.name === 'SaveImage');
        if(sm) {
            code += '    ' + sm.code.replace(/\n/g, '\n    ') + '\n\n';
        }
    }
    methodNames.forEach(mn => {
        if(mn === 'SaveImage') return;
        const m = methods.find(x => x.name === mn);
        if(m) {
            code += '    ' + m.code.replace(/\n/g, '\n    ') + '\n\n';
        } else {
            console.log('Warning: Method not found: ' + mn);
        }
    });
    code += '}\n';
    fs.writeFileSync('c:/Pages/HT DISTRIBUIDORA DEL BAJIO/api/HTLogistics.Api/Controllers/' + name + '.cs', code, 'utf8');
};

writeController('AuthController', ['Login', 'CreateUser', 'UpdateUser']);
writeController('CatalogsController', ['GetState', 'GetReports', 'CreateBranch', 'CreateWarehouse', 'CreateDriver', 'CreateVehicle', 'CreateRoute', 'CreateProvider', 'UpdateProvider', 'CreateClient', 'UpdateClient', 'CreateExpenseCategory', 'CreateExpense', 'GetLoadingSheet', 'RecordVisit']);
writeController('InventoryController', ['CreateProduct', 'UpdateProduct', 'CreatePurchaseOrder', 'ApplyPurchaseOrder', 'UpdateBulkProducts']);
writeController('OrdersController', ['SaveImage', 'CreateOrder', 'ReportIncident', 'AuthorizeOrder', 'AuthorizeAdminOrder', 'CompleteDelivery', 'UpdateOrderStatus', 'CreateReturn', 'AuthorizeReturn', 'StampOrder']);
writeController('FinanceController', ['CreateCashClosure', 'DeclareCashClosure', 'AddPayment', 'GetAccountStatement']);

fs.renameSync('c:/Pages/HT DISTRIBUIDORA DEL BAJIO/api/HTLogistics.Api/Controllers/AppController.cs', 'c:/Pages/HT DISTRIBUIDORA DEL BAJIO/api/HTLogistics.Api/Controllers/AppController.cs.bak');

console.log('Successfully split AppController into 5 controllers.');
