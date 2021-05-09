import { Middleware } from './Middleware'
import { METHODS } from './constant'
import { merge } from '@prequest/utils'
import { Context, Config, MethodsCallback, RequestOption, Adapter } from '@prequest/types'

export class PreQuest<T, N> extends Middleware<T, N> {
  constructor(private adapter: Adapter<T, N>, private config?: Config<T>) {
    super()
    this.config = merge(PreQuest.defaults, this.config)
    this.mount()
  }

  private mount() {
    const preQuest = <MethodsCallback<T, N>>(this as unknown)

    METHODS.forEach(method => {
      preQuest[method] = (path: string, config?: Config<T>) => {
        const request = <RequestOption<T>>merge(this.config, { path, method } as any, config!)
        const response = <N>{}
        return this.controller({ request, response })
      }
    })
  }

  request(path: string | Config<T>, config?: Config<T>) {
    const opt = typeof path === 'string' ? merge({ path }, config) : path
    const request = <RequestOption<T>>merge(this.config, opt)
    const response = <N>{}
    return this.controller({ request, response })
  }

  private controller(ctx: Context<T, N>): Promise<N> {
    return this.exec(ctx, async ctx => {
      const response = await this.adapter(ctx.request)
      ctx.response = response
    }).then(() => ctx.response)
  }

  static defaults = {}

  static create<T, N>(adapter: Adapter<T, N>, config?: Config<T>): PreQuestInstance<T, N> {
    const instance = new PreQuest<T, N>(adapter, config) as PreQuestBaseInstance<T, N>

    return new Proxy(adapter as any, {
      get(_, name) {
        return Reflect.get(instance, name) || Reflect.get(adapter, name)
      },
      apply(_, __, args) {
        return Reflect.apply(instance.request, instance, args)
      },
    })
  }
}

type PreQuestFn<T, N> = (path: string | T, config?: T) => Promise<N>

type PreQuestBaseInstance<T, N> = PreQuest<T, N> & MethodsCallback<T, N>

export type PreQuestInstance<T, N> = PreQuestBaseInstance<T, N> & PreQuestFn<T, N>
