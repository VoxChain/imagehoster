/** Serve files from blob store. */

import * as Koa from 'koa'
import streamHead from 'stream-head/dist-es6'

import {APIError} from './error'
import {store} from './store'
import {mimeMagic} from './utils'

export async function serveHandler(ctx: Koa.Context) {
    ctx.tag({handler: 'serve'})

    APIError.assert(ctx.method === 'GET', APIError.Code.InvalidMethod)
    APIError.assertParams(ctx.params, ['hash'])

    const file = store.store.createReadStream(ctx.params['hash'])
    file.on('error', (error) => {
        if (error.notFound) {
            ctx.res.writeHead(404, 'Not Found')
        } else {
            ctx.log.error(error, 'unable to read %s', ctx.params['hash'])
            ctx.res.writeHead(500, 'Internal Error')
        }
        ctx.res.end()
        file.destroy()
    })

    const {head, stream} = await streamHead(file, {bytes: 16384})
    const mimeType = await mimeMagic(head)

    ctx.response.set('Content-Type', mimeType)
    // TODO: cache control headers
    ctx.body = stream
}