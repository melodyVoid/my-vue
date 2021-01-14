import Dep from './dep'

export default class Observer {
  constructor(data) {
    this.walk(data)
  }

  walk(data) {
    // 判断类型
    if (typeof data !== 'object' || data === null) {
      return 
    }
    // 确保是对象类型
    // 遍历 data 对象的所有属性
    Object.keys(data).forEach(key => {
      this.defineReactive(data, key, data[key])
    })
  }

  defineReactive(obj, key, value) {
    // 缓存当前 this，留给下面 set 方法用
    const self = this

    // 负责收集依赖，并发送通知
    const dep = new Dep()

    // 如果 value 是对象，也把这个对象变成响应式数据
    this.walk(value)
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        // 收集依赖,Dep.target 就是 watcher
        Dep.target && dep.addSub(Dep.target)
        return value
      },
      set(newValue) {
        if (newValue === value) {
          return 
        }
        value = newValue
        self.walk(newValue)
        // 发送通知
        dep.notify()
      }
    })
  }
}