#Waterfall

web图片瀑布流显示组件

##使用方法：

    /**
     * 初始化
     * @param {String} elemId   容器id
     * @param {Object} settings 配置
     */
    var waterfall = new Waterfall(elemId, settings);
    
##配置参数（settings）：

    // 图片dom之间的间距
    margin: 0, 
    // 宽度、高度像素补偿
    // dom的宽度、高度可能大于中间图片的宽度、高度
    // 比如需要添加边框、相框、或者图片下面文字
    // 一下2个值为没一个water的补偿值
    offsetH: 0, // 宽度补偿
    offsetV: 0, // 高度补偿
    // 瀑布流底部留白部分像素高度，高度最高的一列下面留白的部分
    // 如果页面是以scroll到底部来触发加载更多的方法，
    // 如果没有留白的部分，那可能加载完成后也看不到新加载的图，
    // 它们很可能在可视区域的下方，使用户不知道新的图片已经加载
    // 用户必须再次向下滚动才能看到，所以需要一个留白部分
    whiteBottom: 50,

    // 瀑布列数，等分计算出列宽
    // 如果大于0，瀑布流就会按固定列数加载
    // 也会导致minWidth失效
    cols: 0,
    // 最小water的宽度
    // 按((瀑布流容器的宽度 - margin)/(minWidth + margin))计算可以分多少列,然后等分计算出列宽
    // 如果cols大于0，则使用固定列数布局，此设定值无效
    minWidth: 100,

    // ajax配置
    ajaxDataType: 'json', // ajax接口数据类型

    // ajax接口url模版
    // 如果使用了这个配置，并且所配置的字符串中存在{{pno}}，则ajaxUrl与ajaxData失效
    // 会使用当前页码替换'{{pno}}'作为接口的url
    // 例如 '/data?pno={{pno}}&param1=XX&param2=XXX'，则使用'/data?pno=1&param1=XX&param2=XXX'作为第一页的请求url
    ajaxUrlTemplate: '',

    ajaxUrl: '', // ajax接口url
    ajaxData: {}, // ajax接口参数（除当前页参数）
    pageIndexName: 'pno', // ajax接口页码参数名称

    // 起始页码，有些ajax接口页码从1开始
    startPageIndex: 0,

    // 水滴water容器的tagName
    // 得到图片数据后，会生产一个该tagName的元素
    // 使用template方法生成dom，插入到该元素
    // 最后把该元素插入到瀑布流容器中
    // 请尽量不要为其设定会造成其css宽度高度与元素实际占用的宽度高度不服的css属性
    // 如果 margin padding border等，否则请自行计算好补偿值
    waterBox: 'li',
    /**
     * 从ajax接口返回数据解析出图片数据数组的方法
     * @param  {Object} res ajax接口的response
     * @return {Array}     图片数据数组
     */
    parse: function(res){
        return (res instanceof Array) ? res : [];
    },
    /**
     * 从单个图片数据中获取图片url的方法
     * @param  {Object} item 单个图片数据
     * @return {String}      图片的url
     */
    url: function(item){
        return item ? item.url : '';
    },
    /**
     * 水滴dom模版方法
     * @param  {object} item 单个图片数据
     * @return {String}      水滴dom字符串
     */
    template: function(item){
        return '';
    },
    /**
     * 每一页及其所有图片加载完成（失败）后的回调
     * @param  {Object} res ajax接口的response   
     */
    pageLoaded: function(res){
    },
    /**
     * 没一个水滴项图片想在完成后的回调
     * @param  {Object} item 单个图片数据   
     */
    itemRendered: function(item){
    },
    /**
     * 按回调数据判断是否是最后一页
     * @param  {Object} res ajax接口的response
     * @return {Boolean}    是否是最后一页
     */
    last: function(res){
        return false;
    },
    /**
     * 加载下一页时，发现没有下一页时的回调
     */
    noMore: function(){

    }
    
##方法：

    /**
	 * 加载新一页的方法
	 */
	waterfall.loadMore();

	/**
	 * 重置方法，可用作动态调整列数
	 * @param  {?Number} cols 列数
	 */
	waterfall.reset(cols);
