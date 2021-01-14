# Vue 原理分析

## 响应式原理概述

- 数据驱动
- 响应式的核心原理
- 发布订阅模式和观察者模式

### 数据驱动

- 数据响应式、双向绑定、数据驱动
- 数据响应式
  - 数据模型仅仅是普通的 JavaScript 对象，而当我们修改数据时，视图会进行更新，避免了繁琐的 DOM 操作，提高开发效率。
- 双向绑定
  - 数据改变，视图改变；视图改变，数据也随之改变
  - 我们可以使用 v-model 在表单元素上创建双向数据绑定
- 数据驱动是 Vue 最独特的特性之一
  - 开发过程中仅需要关注数据本身，不需要关心数据是如何渲染到视图

### 数据响应式核心原理 Vue2

当把一个普通 JavaScript 对象传入 Vue 实例作为 `data` 选项，Vue 将**遍历次对象所有属性**，并使用 `Object.defineProperty` 把这些属性全部转为 `getter/setter`。`Object.defineProperty` 是 ES5 中一个无法 shim 的特性，这也就是 Vue 不支持 IE8 以及更低版本浏览器的原因。

[defineProperty Demo](https://codesandbox.io/s/defineproperty-cc7bi?file=/src/index.js)

```js
const data = {
  msg: '',
}

// 模拟 Vue 实例
const vm = {}

// 数据劫持：当访问或者设置 vm 中的 msg 属性的时候，做一些干预操作
Object.defineProperty(vm, 'msg', {
  // 可枚举
  enumerable: true,
  // 可配置（可以 delete 删除，可以使用 defineProperty 重新定义）
  configurable: true,
  get() {
    console.log('get', data.msg)
    return data.msg
  },
  set(newValue) {
    console.log('set', newValue)
    if (newValue === data.msg) {
      return
    }
    data.msg = newValue

    // 数据改变，更新视图
    document.getElementById('app').innerText = newValue
  },
})

vm.msg = '你好'
console.log(vm.msg)
```

以上是对一个属性的劫持，要是多个属性呢？

答案是需要遍历对象的所有属性

### 数据响应式核心原理 Vue3

Vue3 使用 ES6 提供的 [Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 来实现对象的劫持。它能够直接监听对象，而不是监听某个属性。

[Proxy Demo](https://codesandbox.io/s/defineproperty-cc7bi?file=/src/index.js)

```js
const data2 = {
  msg: '',
}

const vm2 = new Proxy(data2, {
  get(target, key, receiver) {
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    if (value === Reflect.get(target, key)) {
      return
    }
    Reflect.set(target, key, value, receiver)
    // 数据改变，更新视图
    document.getElementById('app2').innerText = value

    return true
  },
})

vm2.msg = '你好 Proxy'
```

## 发布订阅模式

### 发布订阅模式

发布/订阅模式

- 订阅者
- 发布者
- 信号中心

> 我们假定，存在一个“信号中心”，某个任务执行完成，就向信号中心“发布”（publish）一个信号，其他任务可以向信号中心“订阅”（subscribe）这个信号，从而知道什么时候自己可以开始执行。**这就叫做发布/订阅模式（publish-subscribe pattern）。**

```js
// Vue 自定义事件
const vm = new Vue()

// 注册事件（订阅消息）
vm.$on('dataChange', () => {
  console.log('dataChange')
})

// 触发事件（发布消息）
vm.$emit('dataChange')
```

我们想一下 vm 内部是怎么存储我们的事件呢？

应该是每个事件维护一个数组，用来存储注册的事件。类似下面这样：

```js
{
  'click': [fn1, fn2, fn3],
  'change': [fn],
}
```

`$emit` 的工作原理就是遍历数组，然后依次执行函数。

下面我们来手动实现一下：

[发布订阅模式](https://codesandbox.io/s/fabudingyuemoshi-q5nsm?file=/src/index.js)

```js
// 定义一个类
class EventEmitter {
  constructor() {
    // { 'click': [fn1, fn2, fn3], 'change': [fn] }
    // this.subscribes = {}
    this.subscribes = Object.create(null)
  }

  // 订阅事件
  $on(eventType, handler) {
    // 如果存在该事件类型的事件数组的话就取存在的数组，如果不存在就赋值为空数组
    this.subscribes[eventType] = this.subscribes?.[eventType] ?? []

    // 然后把新事件添加进入
    this.subscribes[eventType].push(handler)
  }

  // 发布事件
  $emit(eventType, ...args) {
    if (this.subscribes[eventType]) {
      this.subscribes[eventType].forEach(handler => handler(...args))
    }
  }
}

const emitter = new EventEmitter()

emitter.$on('change', value => {
  console.log('change1', value)
})

emitter.$on('change', value => {
  console.log('change2', value)
})

emitter.$emit('change', 1)
```

控制台输出

```
change1 1
change2 1
```

### 观察者模式

- 观察者（订阅者） -- Watcher
  - `update()`: 当事件发生时，具体要做的事情
- 目标（发布者） -- Dep
  - `subs` 数组：存储所有的观察者
  - `addSubs()`：添加观察者
  - `notify()`：当事件发生时，调用所有观察者的 `update()` 方法
- 没有事件中心

我们来简单实现一下，暂不考虑传参的情况

[观察者模式](https://codesandbox.io/s/guanchazhemoshi-wuql3?file=/src/index.js)

```js
// 定义观察者类
class Watcher {
  update() {
    console.log('update')
  }
}

// 定义发布者类
class Dep {
  // 存储所有的观察者
  constructor() {
    this.subs = []
  }

  // 添加观察者
  addSubs(sub) {
    // 如果有 sub 并且 sub 有 update 方法，我们认为是一个合法的 Watcher
    if (sub && sub.update) {
      this.subs.push(sub)
    }
  }

  // 通知
  notify() {
    // 遍历所有的观察者，然后执行观察者的 update() 方法
    this.subs.forEach(sub => sub.update())
  }
}

const watcher = new Watcher()
const dep = new Dep()

dep.addSubs(watcher)
dep.notify()
```

控制台打印

```
update
```

### 总结

- **发布/订阅模式**：由统一调度中心调用，因此发布者和订阅者不需要知道对方的存在。
- **观察者模式**：由具体目标调度，比如当事件触发，Dep 就会去调用观察者方法，所以观察者模式的订阅者与发布者之间是存在依赖的。

![](https://www.notion.so/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2Fd822c970-e09b-4923-9b8d-acb62b1cbed8%2FUntitled.png?table=block&id=e695ee31-8b1c-4b07-b800-b712d18dc0f4&width=2060&userId=701e002b-a2b1-498c-b7bf-68346722fdf5&cache=v2)

## Vue 响应式原理模拟

### 响应式原理分析

#### 整体分析

- Vue
  - 把 `data` 中的成员注入到 Vue 实例，并且把 `data` 中的成员转换成 `getter/setter`。
- Observer
  - 能够对数据对象的所有属性进行监听，如有变动可拿到最新值并通知 Dep。
- Dep
  - 作用是添加观察者，当数据发生变化的时候通知（`notify()`）所有的观察者。
- Watcher
  - 观察者，内部有一个 `update()` 方法，负责更新视图。
- Compiler
  - 解析每个元素中的指令以及插值表达式并替换成相应的数据。

### Vue

我们要实现的功能

- 负责接收初始化的参数（options）
- 负责把 `data` 中的属性注入到 Vue 实例，转换成 `getter/setter`
- 负责调用 `observer` 监听 `data` 中所有属性的变化
- 负责调用 `compiler` 解析指令和插值表达式

[查看代码](https://codesandbox.io/s/great-poincare-svwwz?file=/src/vue.js)

```js
class Vue {
  constructor(options) {
    const { data, el } = options
    // 1.通过属性保存选项数据
    this.$options = options || {}
    this.$data = data || {}
    this.$el = typeof el === 'string' ? document.querySelector(el) : el
    // 2.把 data 中的成员转换成 getter/setter ，注入到 vue 实例中
    this._proxyData(this.$data)
    // 3.调用 observer 对象，监听数据的变化

    // 4. 调用 compiler 对象，解析指令和插值表达式
  }
  _proxyData(data) {
    // 遍历 data 中的所有属性
    Object.keys(data).forEach(key => {
      // 把 data 的属性注入到 vue 实例中
      // 这里的 this 就是 Vue 的实例
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get() {
          return data[key]
        },
        set(newValue) {
          if (newValue === data[key]) {
            return
          }
          data[key] = newValue
        },
      })
    })
  }
}
```

### Observer

功能：

- 负责把 `data` 选项中的属性转换成响应式数据
- `data` 中的某个属性也是对象，把该属性转换成响应式数据
- 数据变化发送通知

结构

- walk(data) 遍历 data 中的所有属性
- defineReactive(data, key, value) 调用 `Object.defineProperty()` 把属性变成 `getter/setter`

`walk` 在循环的过程中会调用 `defineReactive`

下面我们来实现一下

[Observer](https://codesandbox.io/s/great-poincare-svwwz?file=/src/observer.js)

```js
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
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        // 注意：这里不能写 obj[key]，因为会发生死循环
        return value
      },
      set(newValue) {
        if (newValue === value) {
          return
        }
        value = newValue
        // 发送通知
      },
    })
  }
}
```

然后我们在 `vue.js` 里面去完善一下代码

```js
class Vue {
  constructor(options) {
    ...
    // 3.调用 observer 对象，监听数据的变化
    new Observer(this.$data)
    ...
  }
  ...
}
```

然后我们看下 vm 的结构，发现 $data 里面的属性已经有了 `getter/setter`

[![sNuX5D.png](https://s3.ax1x.com/2021/01/13/sNuX5D.png)](https://imgchr.com/i/sNuX5D)

**defineReactive()**

- 为什么要传递第三个参数 `value` ?
  - 如果 `get()` 直接返回 obj[key] 会造成死循环，`obj[key]` 又是再取值，所以会造成死循环。
- `defineReactive()` 执行完后理应销毁，为什么 `vm.msg` 会打印出值呢？
  - 因为 `$data` 中引用了 `defineReactive()` 中的 `get()` 方法，造成了闭包。`get()` 方法对 `value` 有引用，所以 `value` 不会被销毁掉。

接下来我们实现将 `data` 中的对象也让它变成响应式

```js
class Observer {
  ...
  defineReactive(obj, key, value) {
    // 如果 value 是对象，也把这个对象变成响应式数据
    this.walk(value)
    ...
  }
}
```

此时我们再思考一个问题：vm.msg 之前是一个字符串，如果我们把它修改为对象，那么这个对象是否会变成响应式的数据呢？

```js
console.log(vm.msg) // Hello World
vm.msg = { a: 'test' }
```

[![sNlMqI.png](https://s3.ax1x.com/2021/01/13/sNlMqI.png)](https://imgchr.com/i/sNlMqI)

我们发现并有变成响应式数据，下面我们解决一下这个问题在 `set()` 里面调用一下 `this.walk()` 方法。但是此处的 `this` 并不是 Observer 的实例，我们需要用 `self` 来进行一下缓存。

```js
defineReactive(obj, key, value) {
  // 缓存当前 this，留给下面 set 方法用
  const self = this
  // 如果 value 是对象，也把这个对象变成响应式数据
  this.walk(value)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      return value
    },
    set(newValue) {
      if (newValue === value) {
        return
      }
      value = newValue
      self.walk(newValue)
      // 发送通知
    }
  })
}
```

现在 `vm.msg` 里的对象也变成响应式的了。

### Compiler

功能

- 负责编译模板，解析指令、插值表达式
- 负责页面的首次渲染
- 当数据变化后重新渲染视图

结构

- `el` `options.el` DOM 对象
- `vm` vue 的实例，后面的方法会用到 vm 中的数据
- `compile(el)` 遍历 DOM 对象的所有节点，如果是文本节点解析插值表达式，如果是元素节点的话解析指令
- `compileElement(node)` 解析元素中的指定
- `compileText(node)` 解析插值表达式
- `isDirective(attrName)` 判断元素中的属性是否是指令
- `isTextNode(node)` 判断当前节点是文本节点
- `isElementNode(node)` 判断当前节点是元素节点

```js
export default class Compiler {
  constructor(vm) {
    this.el = vm.$el
    this.vm = vm
  }

  // 编译模板，处理文本节点和元素节点
  compile(el) {}
  // 编译元素节点，处理指令
  compilerElement(node) {}
  // 编译文本节点，处理插值表达式
  compilerText(node) {}
  // 判断元素中的属性是否是指令
  isDirective(attrName) {
    return attrName.startsWith('v-')
  }
  // 判断节点是否是文本节点
  isTextNode(node) {
    return node.nodeType === 3
  }
  // 判断节点是否是元素节点
  isElementNode(node) {
    return node.nodeType === 1
  }
}
```

然后我们再来实现 `compile()` 方法

```js
class Compiler {
  ...
  compile(el) {
    // el 下的所有子节点
    let childNodes = el.childNodes
    Array.from(childNodes).forEach(node => {
      if (this.isTextNode(node)) {
        // 处理文本节点
        this.compileText(node)
      } else if (this.isElementNode(node)) {
        // 处理元素节点
        this.compileElement(node)
      }

      // 判断 node 节点是否有子节点，如果有子节点，要递归调用 compile
      if (node.childNodes && node.childNodes.length) {
        this.compile(node)
      }
    })
  }
}
```

下面我实现 `compileText()`

我们先看一下文本节点长什么样子，这里我们先在 `vue.js` 中添加 `Compiler`

```js
class Vue {
  // 4. 调用 compiler 对象，解析指令和插值表达式
  new Compiler(this)
}
```

然后我们希望调用 `Compiler` 的时候就开始编译模板，我们修改下 `Compiler`

```js
class Compiler {
  constructor(vm) {
    this.el = vm.el
    this.vm = vm
    // 开始编译模板
    this.compile(this.el)
  }
}
```

```js
class Compiler {
  ...
  compilerText(node) {
    // console.dir(node)
    // {{ msg }}
    let reg = /\{\{(.+?)\}\}/
    let value = node.textContent
    if (reg.test(value)) {
      let key = RegExp.$1.trim()
      node.textContent = value.replace(reg, this.vm[key])
    }
  }
}
```

接下来我们实现最后一个功能

```js
class Compiler {
  ...
  compilerElement(node) {
    // console.log(node.attribute)
    // 遍历所有的属性节点
    Array.from(node.attributes).forEach(attr => {
      // 判断是否是指令
      let attrName = attr.name
      if (this.isDirective(attrName)) {
        // v-text --> text
        attrName = attrName.substr(2)

        let key = attr.value
        this.update(node, key, attrName)
      }
    })
  }

  update(node, key, attrName) {
    let updateFn = this[`${attrName}Updater`]
    updateFn && updateFn(node, this.vm[key])
  }

  // 处理 v-text 指令
  textUpdater(node, value) {
    node.textContent = value
  }

  // 处理 v-model 指令
  modelUpdater(node, value) {
    node.value = value
  }
}
```

至此我们的 Compiler 模块也完成了

### Dep

Dep(Dependency) 作用是收集依赖，

- 在 `getter()` 方法中收集依赖。每一个响应式的**属性**，都会创建一个对应的 `Dep` 对象，它负责收集所有依赖**该属性**的地方，所有依赖该属性的位置都会创建一个 `Watch` 对象。所以 `Dep` 收集的就是依赖与**该属性**的 `Watch` 对象。
- 在 `setter()` 中会通知依赖，当属性的值发生变化的时候，会调用 `Dep` 的 `notify()` 方法发送通知，从而调用 `Watch` 对象的 `update` 方法。

[![sUzAd1.png](https://s3.ax1x.com/2021/01/14/sUzAd1.png)](https://imgchr.com/i/sUzAd1)

功能

- 收集依赖，添加观察者（watcher）
- 通知（notify）所有观察者

结构

- `subs`
- `addSub(sub)`
- `notify()`

我们来实现一下

```js
class Dep {
  constructor() {
    // 存储所有的观察者
    this.subs = []
  }

  // 添加观察者
  addSub(sub) {
    if (sub && sub.update) {
      this.subs.push(sub)
    }
  }

  // 发送通知
  notify() {
    this.subs.forEach(sub => {
      sub.update()
    })
  }
}
```

创建好这个 `Dep` 类之后，我们需要在 `Observer` 模块中去为每一个响应式对象的属性创建一个 `Dep` 对象用来收集依赖。打开 `observer.js` 文件

```js
class Observer {
  ...
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
```

这里我们做到了为每个属性创建一个 `Dep` 对象，并在 `setter` 里面去发送通知。那么怎么收集依赖呢？

需要在 `getter` 里面去收集依赖，当访问该属性的时候收集依赖。

在 `get()` 里面先判断一下 `Dep` 有没有 `target` 这个静态属性，如果有的话，调用 `dep` 的 `addSub()` 方法。`Dep.target` 就是观察者。

我们给 `Dep` 类添加一个静态属性 `target`

```js
get() {
  // 收集依赖,Dep.target 就是 watcher
  Dep.target && dep.addSub(Dep.target)
  return value
},
```

### Watcher

[![samxFU.png](https://s3.ax1x.com/2021/01/14/samxFU.png)](https://imgchr.com/i/samxFU)

功能

- 当数据变化触发依赖， `dep` 通知所有的 `Watcher` 视力更新视图
- 自身实例化的时候往 `dep` 对象中添加自己

结构

- `vm` vue 实例
- `key` data 中的属性名称
- `cb` 如何更新视图
- `oldValue` 变化之前的值
- `update()` 更新视图

下面我们来实现一下

```js
import Dep from './dep'

export default class Watcher {
  constructor(vm, key, cb) {
    this.vm = vm
    // data 中的属性名称
    this.key = key
    // 回调函数负责更新视图
    this.cb = cb

    // 把 watcher 对象记录到 Dep 类的静态属性 target
    Dep.target = this

    // 触发 get 方法在 get 方法中会调用 addSub
    this.oldValue = vm[key]

    // 重置 target
    Dep.target = null
  }
  // 当数据发生变化的时候更新视图
  update() {
    let newValue = this.vm[this.key]
    if (newValue === this.oldValue) {
      return
    }
    this.cb(newValue)
  }
}
```

然后在 `Compile` 模块中添加 `watcher`

```js
class Compiler {
  ...
  update(node, key, attrName) {
    const updateFn = this[`${attrName}Updater`].bind(this)
    updateFn && updateFn(node, this.vm[key], key)
  }

  textUpdater(node, value, key) {
    node.textContent = value
    // 注意：此时的 this 是有问题的，因为 updateFn 是直接调用的，我们需要绑定一下
    new Watcher(this.vm, key, newValue => {
      node.textContent = newValue
    })
  }

  modelUpdater(node, value, key) {
    node.value = value

    new Watcher(this.vm, key, newValue => {
      node.value = newValue
    })
  }
  // 编译文本节点，处理插值表达式
  compilerText(node) {
    // console.dir(node)
    // {{ msg }}
    let reg = /\{\{(.+?)\}\}/
    let value = node.textContent
    if (reg.test(value)) {
      let key = RegExp.$1.trim() // msg
      node.textContent = value.replace(reg, this.vm[key])

      // 创建 watcher 对象，在数据改变时更新视图
      new Watcher(this.vm, key, newValue => {
        node.textContent = newValue
      })
    }
  }
  ...
}
```

这样当我们修改 `vm.msg = '123'` 的时候，页面就同步进行更新了。但是我们在视图上通过 `<input type="text" v-model="msg" />` 来改变值的时候，发现视图并没有更新，接下来我们来实现双向绑定。

### 总结

- Vue
  - 通过属性保存选项数据
  - 把 data 中的成员转换成 getter/setter，注入到 vue 实例中
  - 调用 observer 对象，监听数据变化
  - 调用 compiler 对象，解析指令和插值表达式
- Compiler
  - 遍历对象的属性，通过 `Object.defineProperty` 监听 `getter/setter`
  - 如果属性还是对象，递归遍历
  - 在 `getter` 中收集依赖
  - 在 `setter` 中通知更新
- Dep
  - 添加 `watcher`
  - 发送通知，调用每个 `watcher` 的 `update()` 方法
- Watcher
  - 接收 vue 实例
  - 接收收集依赖的属性名 `key`
  - 接收更新视图的回调函数 `cb`
  - 把 `watcher` 对象记录到 `Dep` 类的静态属性上 target
  - 触发 `get` 方法，调用 `dep.addSub()`
  - 重置 `Dep.target`
  - 定义 `update()` 方法
  - 在 `Compiler` 模块中的更新视图方法上添加 `watcher`
