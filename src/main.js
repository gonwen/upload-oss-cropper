import Vue from 'vue'
import 'babel-polyfill'
import ElementUI from 'element-ui'
import App from './App.vue'
import 'element-ui/lib/theme-chalk/index.css'
Vue.use(ElementUI, {size: 'small'})

new Vue({
    el: '#app',
    render: h => h(App)
})
