/**
 * 基于jquery的瀑布流显示图片的组件
 */

var Waterfall = (function(){
	'use strict';

	// 默认配置
	var options = {
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
	};

	var pageIndex = 0, // 当前页码 
			// 是否加载中，用来作一个同步锁，防止用户在前一次请求的图片还没加载的情况下加载下一页
			loading = false,
			// 水滴宽度
			waterWidth,
			// 列高度数组
			columns,
			// 已加载的图片数据数组
			waters = [],
			// 水滴中的图片宽度
			imgWidth,
			// 瀑布流容器
			wrapper,
			// 当前高度最小的列的index
			minColumn = 0,
			// 当前列数
			columnsCount = 0,
			// 是否已经没有下一页的数据
			noMore = false,
			// 是否固定列数
			fixed,
			// 瀑布流容器的宽度
			wrapperWidth,
            // 是否使用urltemplate方式
            isUrlTemplate,
            // url template 页码替换正则
            re = /\{\{pno\}\}/gi;
	// 浏览器console log方法
	var log = (console && console.log) ? function(msg){ console.log(msg); } : function(msg){};

	/**
	 * 在水滴加载后，重新计算每一列的高度和最小列的index，
	 * 以便计算下一个水滴的放置位置
	 * 设定瀑布流容器高度
	 */
	function calculateColumnsHeight() {
		// 最大列高和最小列高
		var minH = Math.min.apply({}, columns);
		var maxH = Math.max.apply({}, columns);

		// 当前高度最大列的高度加上配置的留白高度，
		// 算出瀑布流容器该有的高度，并设定其高度
		var wrapperHeight = (maxH + options.whiteBottom);
		wrapper.style.height = wrapperHeight.toString() + 'px';

		// 计算当前高度最小的列的index
		var columnCount = columns.length;
		for(var i = 0; i < columnCount; i++){
			if(columns[i] === minH){
				minColumn = i;
				break;
			} 
		}
	};

	/**
	 * 按图片数据和图片的自然宽高，加载水滴dom到瀑布流容器
	 * @param  {Object} item        图片数据
	 * @param  {Number} imageWidth  图片自然宽度
	 * @param  {Number} imageHeight 图片自然高度            
	 */
	function renderWater(item, imageWidth, imageHeight){
		// 以options.waterBox为tagName初始化一个dom片段
		var itemElem = document.createElement(options.waterBox);

		// 计算dom的高度、及绝对定位的位置
		var itemHeight = Math.ceil(Math.ceil(imgWidth) * imageHeight / imageWidth) + options.offsetV;
		var itemTop = columns[minColumn] + options.margin;
		var itemLeft = (waterWidth + options.margin) * minColumn + options.margin;

		// 设定style
		itemElem.style.position = 'absolute';
		itemElem.style.width = waterWidth + 'px';
		itemElem.style.height = itemHeight + 'px';
		itemElem.style.top = itemTop + 'px';
		itemElem.style.left = itemLeft + 'px';

		// 加入options.template方法生成的dom
		itemElem.innerHTML = options.template(item);

		// 将dom加入到瀑布流容器
		wrapper.appendChild(itemElem);

		// 重新计算被插入列的高度
		columns[minColumn] += itemHeight + options.margin;

		// 重新计算每一列的高度和最小列的index
		calculateColumnsHeight();

		// 触发单个水滴图片加载后的回调
		options.itemRendered(item);
	};

	/**
	 * 重置水滴宽高和位置
	 * 在容器的宽度改变或者列数改变时，会用到
	 * 考虑到删除dom再重新添加dom的开销比较高，这个方法只是对现有dom的宽高和位置进行调整
	 * @param  {Object} itemElem    图片数据
	 * @param  {Number} imageWidth  图片自然宽度
	 * @param  {Number} imageHeight 图片自然高度            
	 */
	function resetPosition(itemElem, imageWidth, imageHeight){
		var itemHeight = Math.ceil(Math.ceil(imgWidth) * imageHeight / imageWidth) + options.offsetV;
		var itemTop = columns[minColumn] + options.margin;
		var itemLeft = (waterWidth + options.margin) * minColumn + options.margin;
		itemElem.style.width = waterWidth + 'px';
		itemElem.style.height = itemHeight + 'px';
		itemElem.style.top = itemTop + 'px';
		itemElem.style.left = itemLeft + 'px';	

		columns[minColumn] += itemHeight + options.margin;
		calculateColumnsHeight();
	};

	/**
	 * 将图片数据和自然宽高添加到数组waters
	 * @param  {Object} item        图片数据
	 * @param  {Number} imageWidth  图片自然宽度
	 * @param  {Number} imageHeight 图片自然高度 
	 */
	function pushWater(item, imageWidth, imageHeight){
		waters.push({
			item: item,
			width: imageWidth,
			height: imageHeight
		});
	};

	/**
	 * ajax beforeSend回调（上锁）
	 */
	function loadStart(){
		loading = true;
	};

	/**
	 * ajax error回调（解锁）
	 */
	function loadEnd(){
		loading = false;
	};

	/**
	 * 每页数据及其图片加载完成后执行
	 * 执行options.pageLoaded
	 * pageIndex加1
	 * 调用loadEnd方法
	 * @param  {[type]} res ajax的response
	 */
	function loadComplete(res){
		options.pageLoaded(res);
		pageIndex++;
		loadEnd();
	};

	/**
	 * ajax success回调
	 * @param  {Object} res ajax的response
	 */
	function callbackAjax(res){
		var thisRenderWater = renderWater;
		var thisPushWater = pushWater;
		var thisLoadComplete = loadComplete;

		// 从response中解析出图片数组数组
		var pageData = options.parse(res);
		// response中的图片数
		var pageCount = pageData.length;

		// 单个图片数据
		var item, 
				url, // 图片url
				img;	// 图片element

		// 图片加载完成的个数
		var done = 0;

		// 设置是否是最后一页
		noMore = options.last(res);

		// 判断解析出的数据是否是数组
		if(!(pageData instanceof Array)){
			log('data parse error!');
			return;
		}

		// 遍历图片数据
		for(var i = 0; i < pageCount; i++){
			// 获取图片url
			item = pageData[i];
			if(item) { 
				url = options.url(item);
			}
			// 判断数据是否有效
			if(!(item && url)){
				log('data parse error:');
				log(item);
				done++;
				continue;
			}
			// 新建图片element，并设定src，把图片数据保存到搞element
			img = new Image();
			img.src = url;
			$(img).data('data', item);

			// 图片的onload事件，为计算图片的自然宽高，把图片数据生成done加入到瀑布流中
			img.onload=function(){
				// 获取图片数据
				var imageData = $(this).data('data');
				// 把水滴写入容器
				thisRenderWater(imageData, this.width, this.height);
				// 把图片数据push到waters中
				thisPushWater(imageData, this.width, this.height);
				// 判断是否该页的图片已经加载（失败）完，以执行回调
				done++;
				(done === pageCount) && thisLoadComplete(res);	
			};
			img.onerror=function(){
				// 判断是否该页的图片已经加载（失败）完，以执行回调
			  done++;
				(done === pageCount) && thisLoadComplete(res);	
			};
		};

	};

	/**
	 * 按当前列数重置，列高数组
	 * @param  {Number} columnCount 列数            
	 */
	function resetColumns(columnCount){
		columns = [];
		for(var i = 0; i < columnCount; i++){
			columns.push(0);
		}
	};

	/**
	 * 重置瀑布流（在容器的宽度或者列数改变的时候）
	 * @param  {?Number} cols 列数，如果为0或者不设置，则不改变列数，反之改变列数，且使用固定列数（fixed）布局，minWidth失效     
	 */
	function reset(cols){
		var waterCount, itemDoms, elem, item;
		// 判断是否传入了列数参数，已确定是否固定列数（fixed）
		fixed = cols ? true : fixed;

		// 重置列数
		cols = cols || columnsCount;

		// 判断是否列数或者容器宽度有改变，如果没有改变就return，无需重置
		if(cols === columnsCount && wrapperWidth === wrapper.clientWidth){
			return;
		}

		// 获取容器宽度
		wrapperWidth = wrapper.clientWidth;

		// 如果不是固定列数布局，按minWidth计算列数
		if(!fixed){
			cols = (wrapperWidth - options.margin) / (options.minWidth + options.margin)
			cols = Math.floor(cols);
		}

		// 计算水滴宽度
		waterWidth = (wrapperWidth - ((cols + 1) * options.margin)) / cols;

		// 计算图片宽度
		imgWidth = waterWidth - options.offsetH;

		// 重置列高
		resetColumns(cols);

		// 重置最小高度列
		minColumn = 0;

		// 重写options中设定的列数
		columnsCount = cols;

		// 遍历当前水滴，并修改其宽高位置
		waterCount = waters.length;
		itemDoms = wrapper.getElementsByTagName(options.waterBox);
		for(var i = 0; i < waterCount; i++){
			elem = itemDoms[i];
			item = waters[i];
			resetPosition(elem, item.width, item.height);
		}
	};

	/**
	 * 生成ajax接口参数
	 * @return {Object} 接口参数
	 */
	function ajaxParams(){
		options.ajaxData[options.pageIndexName] = pageIndex;
		return options.ajaxData;
	};

	/**
	 * 加载数据
	 */
	function load(){
        var url = options.ajaxUrl,
            params = ajaxParams();
		// 判断是否有另一页在加载
		if(loading){
			log('Another request of waterfall is processing...');
			return false;
		}
		// 判断是否没有下一页了，如果没有触发noMore回调
		if(noMore){
			log('no more images...');
			options.noMore();
			return false;
		}

        // 接口url判断
        if(isUrlTemplate){
            url = options.ajaxUrlTemplate.replace(re, pageIndex.toString());
            params = {};
        }

		// 请求数据
		$.ajax(url, {
			data: params,
			dataType: options.ajaxDataType, 
			type: 'GET',
			beforeSend: loadStart,
			success: callbackAjax,
			error: loadEnd
		});
	};

	/**
	 * 构造
	 * @param {String} elemId   容器id
	 * @param {Object} settings 配置
	 */
	function Waterfall(elemId, settings){
		var i, timeout;
		// 获取配置
		for (i in settings) options[i] = settings[i];

		// 获取容器
		wrapper = document.getElementById(elemId);

        // 是否使用url template
        isUrlTemplate = options.ajaxUrlTemplate && re.test(options.ajaxUrlTemplate);

		// 设置页码开始值
		pageIndex = options.startPageIndex;

		// 设定是否固定列数
		fixed = options.cols > 0;

		// 初始化列数据
		reset();

		// 加载第一页数据
		load();

		// 没300毫秒检查一次，列数及容器宽度是否需要重置列数据
		// 如页面resize导致容器宽度改变，手机横屏竖屏切换，等状况
		timeout = setInterval(reset, 300);
	};

	/**
	 * 加载新一页的方法
	 */
	Waterfall.prototype.loadMore = load;

	/**
	 * 重置方法，可用作动态调整列数
	 * @param  {?Number} cols 列数
	 */
	Waterfall.prototype.reset = function(cols){
		reset(cols);
	};

	return Waterfall;
})();