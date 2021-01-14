import Vue from './vue'

const vm = new Vue({
  el: '#app',
  data: {
    msg: 'Hello',
    count: 12,
  }
})

console.log(vm)
// vm.msg = { a: 'test' }
debugger
vm.msg = '123'