const { Command } = require('commander');
const fs = require('fs');
const utils = require('./utils');

(async() => {
    const program = new Command();
    program.storeOptionsAsProperties();
    
    const app = require('../package.json');
    program.version(app.version || 'N/A');

    program.description("TempWeave\nhttps://tempweave.com\n\nLicensed under MIT license.");

    program.option('-d, --datadir <path>', 'path to the data directory');
    program.option('-v, --verbose', 'force the logger to show debug level messages', false);

    const clientCommand = program.command('client')
    clientCommand
        .description('start as a client')
        .action(() => { process.env.MODE = 'client'; });

    clientCommand.command('store <path>')
        .description('store a file/folder')
        .action((path) => {
            process.env.MODE = 'client';
            process.env.SUBMODE = 'store';
            process.env.STORE_PATH = path;
        });
    clientCommand.command('makemigration')
        .description('[for developers] create a migration file from models')
        .action(() => {
            process.env.MODE = 'client';
            process.env.SUBMODE = 'makemigration';
        });

    const providerCommand = program.command('provider');
    providerCommand
        .description('start as a provider')
        .action(() => { process.env.MODE = 'provider'; });
    providerCommand.command('makemigration')
        .description('[for developers] create a migration file from models')
        .action(() => {
            process.env.MODE = 'provider';
            process.env.SUBMODE = 'makemigration';
        });

    program.parse(process.argv);

    // Print version
    console.log("TempWeave v" + app.version);

    // Load config
    const config = require('./config');

    // Set datadir
    if (program.datadir) {
        process.env.DATADIR = utils.resolveHome(program.datadir);
    } else {
        process.env.DATADIR = utils.resolveHome(config[process.env.MODE].defaultDatadir);
    }
    // Create if doesn't exist
    utils.mkdirp(process.env.DATADIR);

    // Make migration mode
    if (process.env.SUBMODE && process.env.SUBMODE === 'makemigration') {
        const { makeMigration } = require('./db/makemigration');
        makeMigration();
        process.exit(0);
    }

    if (process.env.MODE === 'client') {
        if (process.env.SUBMODE === 'store') {
            const cmd = require('./cmd');
            await cmd.client_store(process.env.STORE_PATH);
            process.exit(0);
        }
    }

    // Init wallet
    const { initWallet } = require('./wallet');
    const wallet = await initWallet();

    // Start client/provider
    switch(process.env.MODE) {
        case 'client':
            const { startClient } = require('./client');
            await startClient({ wallet });
            break;

        case 'provider':
            const { startProvider } = require('./provider');
            await startProvider({ wallet });
            break;
    }

    // Start API
    const { startApi } = require('./api');
    await startApi();
})();