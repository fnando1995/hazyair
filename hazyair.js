'use strict';

const path = require('path');
const EventEmitter = require('events');

const CronJob = require('cron').CronJob;
const moment = require('moment');
const express = require('express');
//const sse = require('sse-broadcast')();

const Dust = require('./dust');
const Temperature = require('./temperature');

class Hazyair extends EventEmitter {

    constructor(config) {

        super();
        this.apis = [ 'info', 'current', 'last', 'mean' ];
        this.config = config;
        this.config.forEach((item) => {

            if (item.hasOwnProperty('parameter')) {
                if (item.parameter === 'dust') {
                    if (item.hasOwnProperty('options') && item.options.hasOwnProperty('model') &&
                    item.options.hasOwnProperty('device')) {
                        this.dust = new Dust(item.options.model, item.options.device);
                    }
                } else if (item.parameter === 'temperature') {
                    if (item.hasOwnProperty('options') && item.options.hasOwnProperty('model')) {
                        this.temperature = new Temperature(item.options.model); 
                    }
                } else if (item.parameter === 'humidity') {
            
                } else if (item.parameter === 'pressure') {
            
                }
            }

        });
    }

    info (request, response) {

        response.json(this.config);

    }

    listen(options, callback = null) {

        const app = express();

        const service = '/' + path.basename(__filename, '.js');

        app.use(express.static('public'));

//app.get('/events', function (req, res) {
//    sse.subscribe('channel', res);
//});

        app.get(service + '/info', (request, response) => this.info(request, response));

        this.config.forEach((item) => {

            if (item.hasOwnProperty('parameter')) {
                if (!item.hasOwnProperty('options') || !item.options.hasOwnProperty('persistent') ||
                item.options.persistent === true) {
                    new CronJob('0 0 * * * *', () => this[item.parameter].store(), null, true, moment.tz.guess());
                }
                this.apis.forEach((api) => {
                    app.get(service + '/' + item.parameter + '/' + api,
                    (request, response) => this[item.parameter][api](request, response));
                });
            }

        });

        this.server = app.listen(options, () => {

            var host = this.server.address().address;
            var port = this.server.address().port;
            console.log("hazyair service is listening at http://%s:%s.", host, port);
            if (callback !== null) callback();

        });
    }
    
    close(callback = null) {

        this.server.close( async () => {
            const promises = this.config.map(async (item) => {
                if (item.hasOwnProperty('parameter')) {
                    await this[item.parameter].close();
                }
            });         
            await Promise.all(promises);
            console.log('hazyair service has been stopped.');
            if (callback !== null) callback();
        });

    }
}

module.exports = Hazyair;
