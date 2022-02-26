import { createError, createRequestUrl, ErrorCode } from '@prequest/helper'
import { PreQuestRequest } from '@prequest/types'
import { RequestCore } from './types'

export function adapter<T, N>(request: RequestCore) {
  return (opt: T): Promise<N> => {
    return new Promise((resolve, reject) => {
      const finalOption = (opt || {}) as PreQuestRequest
      const url = createRequestUrl(finalOption)
      const { getNativeRequestInstance, cancelToken, ...rest } = finalOption

      let instance = request({
        url,
        ...rest,
        success(res: any) {
          resolve(res)
        },
        fail(e: any) {
          reject(e)
          instance = null
        },
      })

      if (cancelToken) {
        cancelToken.promise.then(() => {
          if (!instance) return

          // 如果支持取消方法
          if (instance.abort) return instance.abort()

          // 如果不支持，则直接抛出错误
          reject(createError(ErrorCode.abort, 'aborted', opt))
        })
      }

      if (getNativeRequestInstance) {
        let resolvePromise: any
        let promise = new Promise(resolve => (resolvePromise = resolve))
        getNativeRequestInstance(promise)

        resolvePromise?.(instance)
      }
    })
  }
}
