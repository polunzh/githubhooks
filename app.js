const express = require('express');
const bodyParser = require('body-parser');
const os = require('os');
const config = require('./config.js');
const path = require('path');
const fs = require('fs-extra')
let simpleGit = require('simple-git')(config.targetDir);

const app = express();

app.use(bodyParser.json());
app.set('x-powered-by', false);

app.all('*', (req, res, next) => {
    if (!req.get('X-GitHub-Event')) {
        return res.status(400).send('Invalid request');
    }

    if (req.get('X-GitHub-Event') === 'ping') {
        return res.status(204).send();
    }

    next();
});

app.post(`/polunzh/${config.repo}`, (req, res, next) => {
    if (req.get('X-GitHub-Event') === 'push') {
        pullLatestRepo((err, result) => {
            if (err) log(err.message);

            log(`[success] Event type: ${req.get('X-GitHub-Event')}`);
            res.status(204).send();
        });
    } else {
        log(`Invalid event type: ${req.get('X-GitHub-Event')}`);
        res.status(400).send('Invalid event type');
    }
});

app.listen(config.port, 'localhost', () => {
    log(`listen on port ${config.port}`);
});

function pullLatestRepo(callback) {
    const tempDir = 'githubhook_temp_' + config.repo + Date.now();
    simpleGit.clone(`https://www.github.com/polunzh/${config.repo}`,
        `${path.join(config.targetDir, tempDir)}`, {
            bare: true
        },
        (err) => {
            if (err) {
                return callback(err);
            }

            fs.move(path.join(config.targetDir, tempDir),
                path.join(config.targetDir, config.repo), {
                    overwrite: true
                },
                err => {
                    if (err) return callback(err);

                    fs.removeSync(tempDir);
                    callback(null);
                });
        });
}

function log(msg) {
    msg = `[${new Date().toLocaleString()}] ${msg} ${os.EOL}`;
    if (app.get('env') === 'development') {
        console.log(msg);
    }

    fs.appendFileSync('log.txt', msg);
}
