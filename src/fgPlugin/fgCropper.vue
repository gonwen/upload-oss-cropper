<template>
    <div class="fg-cropper">
        <div class="crp-box">
            <div class="crp-nav">
                <el-button
                    v-for="(item, index) in btnGroup"
                    :key="index"
                    :icon="item.icon"
                    type="text"
                    @click="handleClick(`${item.type}`)"
                    :ref="item.ref"
                    :title="item.tit">
                    <template slot v-if="!item.icon">
                        {{item.icon ? '' : item.name}}
                    </template>
                </el-button>
            </div>
            <div class="crp-main">
                <vue-cropper
                    v-if="originImg"
                    ref="cropper"
                    :containerStyle="containerStyle"
                    :aspect-ratio="ratio"
                    :src="originImg"
                ></vue-cropper>
            </div>
        </div>
    </div>
</template>

<script>
import vueCropper from 'vue-cropperjs'
import 'cropperjs/dist/cropper.css'

export default {
    name: 'fgCropper',
    props: {
        // 画布区域最大宽度
        maxWidth: {
            default: 800,
            type: Number
        },
        minWidth: {
            default: 400,
            type: Number
        },
        // w/h长宽比   不传或0为自由比例
        ratio: {
            default: 0,
            type: Number
        },
        originImgFile: {
            default: () => {
                return {}
            },
            type: Object
        }
    },
    components: {
        vueCropper
    },
    data () {
        return {
            // 源图
            originImg: './img/sprites.png',
            newImg: '',
            btnGroup: [
                {
                    tit: '放大',
                    icon: 'el-icon-zoom-in',
                    name: 'ZI',
                    type: 'ZI'
                },
                {
                    tit: '缩小',
                    icon: 'el-icon-zoom-out',
                    name: 'ZO',
                    type: 'ZO'
                },
                // {
                //     tit: '顺时针旋转',
                //     icon: 'el-icon-refresh-right',
                //     name: 'RR',
                //     type: 'RR'
                // },
                // {
                //     tit: '逆时针旋转',
                //     icon: 'el-icon-refresh-left',
                //     name: 'RL',
                //     type: 'RL'
                // },
                // {
                //     tit: '水平方向翻转',
                //     name: 'X',
                //     type: 'FX',
                //     ref: 'flipX'
                // },
                // {
                //     tit: '垂直方向翻转',
                //     name: 'Y',
                //     type: 'FY',
                //     ref: 'flipY'
                // },
                {
                    tit: '关闭',
                    icon: 'el-icon-close',
                    name: 'C',
                    type: 'C'
                },
                {
                    tit: '确认',
                    icon: 'el-icon-check',
                    name: 'S',
                    type: 'S'
                }
            ],
            containerStyle: {
                width: this.maxWidth + 'px',
                maxWidth: '800px',
                minWidth: this.minWidth + 'px',
                height: (this.ratio ? this.maxWidth / this.ratio : this.maxWidth) + 'px',
                maxHeight: '600px',
                minHeight: '300px'
            },
            newImgFiles: {}
        }
    },
    created () {
        let files = {...this.originImgFile}
        let file = files.file
        this.newImgFiles = {...files}
        delete this.newImgFiles.file
        this.originImg = window.URL.createObjectURL(file)
    },
    methods: {
        toBlobFix () {
            if (!HTMLCanvasElement.prototype.toBlob) {
                Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
                    value: function (callback, type, quality) {
                        var canvas = this
                        setTimeout(() => {
                            let binStr = atob(canvas.toDataURL(type, quality).split(',')[1])
                            let len = binStr.length
                            let arr = new Uint8Array(len)
                            for (var i = 0; i < len; i++) {
                                arr[i] = binStr.charCodeAt(i)
                            }
                            callback(new Blob([arr], { type: type || 'image/png' }))
                        })
                    }
                })
            }
        },
        getNewImg () {
            this.$refs.cropper.getCroppedCanvas().toBlob(blob => {
                let file = this.originImgFile.file
                blob.name = file.name
                blob.uid = file.uid
                blob.lastModified = file.lastModified
                this.newImgFiles.file = blob
                this.$emit('getNewImgCallback', this.newImgFiles)
            })
        },
        zoomArea (n) {
            this.$refs.cropper.relativeZoom(n)
        },
        changeRotate (deg) {
            this.$refs.cropper.rotate(deg)
        },
        // x、y 镜像翻转
        flipMirror (type) {
            let sign = type ? 'Y' : 'X'
            const dom = this.$refs[`flip${sign}`].$el
            let scale = dom.getAttribute('data-scale')
            scale = scale ? -scale : -1
            this.$refs.cropper[`scale${sign}`](scale)
            dom.setAttribute('data-scale', scale)
        },
        handleClick (type) {
            switch (type) {
                case 'ZI':
                    this.zoomArea(0.2)
                    break
                case 'ZO':
                    this.zoomArea(-0.2)
                    break
                case 'RR':
                    this.changeRotate(90)
                    break
                case 'RL':
                    this.changeRotate(-90)
                    break
                case 'FX':
                    this.flipMirror()
                    break
                case 'FY':
                    this.flipMirror('Y')
                    break
                case 'C':
                    this.$emit('closeCallback')
                    break
                case 'S':
                    this.getNewImg()
                    break
            }
        }
    },
    mounted () {
        this.toBlobFix()
    }
}
</script>

<style lang="scss">
.fg-cropper{
    .crp-box{
        position: relative;
    }
    .crp-main{
        /*padding-right: 50px;*/
    }
    .crp-nav{
        position: absolute;
        top: 100%;
        width: auto;
        text-align: center;
        left: 50%;
        transform: translateX(-50%);
        background-color: #fff;
        margin-top: 4px;
        padding: 2px 9px;
        border-radius: 2px;
        .el-button{
            height: 26px;
            width: 26px;
            margin: 0 9px;
            font-size: 16px;
            text-align: center;
            line-height: 26px;
            padding: 0;
            color: #666;
            border: 1px solid transparent;
            &:hover{
                border-color: #666;
            }
            i{
                font-size: 20px;
                line-height: 26px;
            }
        }
    }
}
</style>
