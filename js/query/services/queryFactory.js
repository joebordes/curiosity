// queryFactory.js

Curiosity.factory('query', function($rootScope, elasticClient, ejsResource, curiosity, keyword, context, log , aggFactory, filters, url){
	var queryObj = {};
	queryObj.info = {};
	queryObj.info.simplifiedRequest = "";
	queryObj.info.complexRequest = "";
	queryObj.info.nbResult = 10;
	queryObj.info.page = 0;
	queryObj.info.maxPage = 0;
	queryObj.info.hits = 0;
	queryObj.info.keywordToShow = [];
	queryObj.info.currentKeyword = [];
	queryObj.info.autoRefresh = true;
	queryObj.info.jsonRequest = {};
	queryObj.info.loading = false;
	queryObj.info.error = false;
	queryObj.info.errorContent = "";
	queryObj.info.result = {};
	
	// Infomration to save in context
	queryObj.queryInfo = {};
	queryObj.queryInfo.simplifiedRequest = queryObj.info.simplifiedRequest;	 
	queryObj.queryInfo.complexRequest = queryObj.info.complexRequest;
 	queryObj.queryInfo.autoRefresh = queryObj.info.autoRefresh;

	var client = elasticClient.getClient(curiosity.info.currentServer);
	var currentKeyword = [];
	var currentIndex = "";
	var queryString = ejs.QueryStringQuery();

	// Context event
	$rootScope.$on("ContextLoaded", function () {
		var flag = false;
		context.setModuleInformation("request", queryObj.queryInfo);
		queryObj.info.simplifiedRequest = queryObj.queryInfo.simplifiedRequest; 	 
		if (queryObj.info.complexRequest = queryObj.queryInfo.complexRequest) {
			flag = true;
		}
		queryObj.info.complexRequest = queryObj.queryInfo.complexRequest; 
 		queryObj.info.autoRefresh = queryObj.queryInfo.autoRefresh;
		queryObj.info.nbResult = queryObj.queryInfo.nbResult;
		queryObj.updateDataFromUrl(); // Load url data after context data
		queryObj.updateQuery(); // Update query
		if (typeof(queryObj.info.nbResult) === "undefined") {
			queryObj.info.nbResult = 10;
		}
		if (flag && queryObj.info.autoRefresh) {
			queryObj.search();
		}
		currentKeyword = keyword.getKeywordListFromIndex(currentIndex);
	});

	$rootScope.$on("UpdateContext", function () {
 		queryObj.queryInfo.autoRefresh = queryObj.info.autoRefresh;
		queryObj.queryInfo.simplifiedRequest = queryObj.info.simplifiedRequest;	 
		queryObj.queryInfo.complexRequest = queryObj.info.complexRequest;
		queryObj.queryInfo.nbResult = queryObj.info.nbResult;
		context.setContextInformation("request", queryObj.queryInfo);
	});

	$rootScope.$on("NoContext", function () {
		queryObj.updateDataFromUrl();
	});

	$rootScope.$on('IndexChange',function (){
		queryObj.updateIndex();
	});

	$rootScope.$on('ServerChange', function() {
	    queryObj.updateClient();
	});

	$rootScope.$on("KeywordUpdate", function () {
		currentKeyword = keyword.getKeywordListFromIndex(currentIndex);
		queryObj.updateQuery();
	});

	function builtRequest(query) {
		var filteredQuery;
		request = ejs.Request();
		queryString.query(query);
		aggFactory.addAggregationToRequest(request);
		var filter = filters.builtFilter(filters.info.filters);
		if (typeof(query) === "undefined" || !query.length){
			filteredQuery = ejs.FilteredQuery(ejs.MatchAllQuery(), filter);
		}
		else {
			filteredQuery = ejs.FilteredQuery(queryString, filter);
		}
		request.query(filteredQuery);
		request.size(queryObj.info.nbResult);
		request.from(queryObj.info.page * queryObj.info.nbResult);
		addSortToRequest(request,queryObj.info.sort);
		queryObj.info.jsonRequest = request;
		return (request);
	}

	function getLastWord(string) {
		var array = string.split(" ");
		if (array.length) {
			return (array[array.length-1]);		
		}
		return ("");
	}

	queryObj.updateIndex = function () {
		currentIndex = curiosity.info.selectedIndex;
		currentKeyword = keyword.getKeywordListFromIndex(currentIndex);
		queryObj.updateQuery();
		if (queryObj.info.autoRefresh) {
			queryObj.search();
		}
	}

	queryObj.updateClient = function ()	{
		client = elasticClient.getClient(curiosity.info.currentServer);
		queryObj.info.result = {};
		queryObj.info.hits = 0;
	}

	queryObj.updateQuery = function () {
		queryObj.info.complexRequest = splitRequest(currentKeyword, queryObj.info.simplifiedRequest).join(" ");
		queryObj.info.keywordToShow = keyword.getKeywordListFromIndexFilter(currentIndex, getLastWord(queryObj.info.simplifiedRequest));
	}

	queryObj.search = function (noReset) {
		curiosity.load(true);
		if (typeof(noReset) === "undefined") {
			queryObj.info.page = 0;
		}
		client.search({index:currentIndex,body:builtRequest(queryObj.info.complexRequest)}).then(
			function (resp) {
				curiosity.load(false);
				curiosity.stopError();
				queryObj.info.result = resp;
				queryObj.info.hits = resp.hits.total;
				aggFactory.updateAggResult(queryObj.info.result.aggregations);
				if (typeof(queryObj.info.nbResult) === "undefined")
					 queryObj.info.nbResult = 10;
				queryObj.info.maxPage = Math.floor(resp.hits.total/queryObj.info.nbResult);
				$rootScope.$broadcast("QueryLaunched");
				log.log("Request : ok", "success");
				queryObj.updateUrlData(); // Update url data on success
			},
			function err(err) {
				curiosity.load(false);
				queryObj.info.result = {};
				queryObj.info.hits = 0;
				queryObj.info.maxPage = 0;
				curiosity.addError(err);
				log.log("Request : ko, Code : " + err.status, "danger");
			}
		)	
	}

	queryObj.notify = function () {
		if (queryObj.info.autoRefresh) {
			queryObj.search();
		}
	}

	queryObj.addValueInQuery = function(keyword) {
		if (queryObj.info.simplifiedRequest.length) {
			if (queryObj.info.simplifiedRequest.charAt(queryObj.info.simplifiedRequest.length-1) != " ") {
				var tmp = queryObj.info.simplifiedRequest.split(" ");
				var re = new RegExp("^" + tmp[[tmp.length-1]] + ".*");
				if (re.test(keyword)) {
					tmp[tmp.length-1] = keyword + " ";
					queryObj.info.simplifiedRequest = tmp.join(" "); 		
				}
				else {
					queryObj.info.simplifiedRequest += " " + keyword + " ";
				}
			}
			else {
				queryObj.info.simplifiedRequest += keyword + " ";
			}
		}
		else {
			queryObj.info.simplifiedRequest +=  keyword + " ";
		}
		queryObj.updateQuery();
	}

	/* PAGER */
	queryObj.firstPage = function() {
		queryObj.info.page = 0;	
		queryObj.search("no");
	}

	queryObj.lastPage = function() {
		queryObj.info.page = queryObj.info.maxPage;
		queryObj.search("no");		
	}

	queryObj.nextPage = function() {
		if (queryObj.info.page < queryObj.info.maxPage) {
			queryObj.info.page++;
			queryObj.search("no");
		}
	}

	queryObj.prevPage = function() {
		if (queryObj.info.page > 0) {
			queryObj.info.page--;
			queryObj.search("no");
		}
	}

	queryObj.goTo = function(page) {
		if (page > 0 && page <= queryObj.info.maxPage) {
			queryObj.page = page;
			queryObj.search("no");
		}
	}

	queryObj.simpleSearch = function(request, index, callback) {
		client.search({index:index,body:request})
			.then(function (resp) {
				callback(resp);
			}, 
			function (err) {
				console.log(err);
			}
		);
	}

	queryObj.addKeywordFromQuery = function (name, value, desc) {
		var nKeyword = {'label':name, 'value':value, 'desc':desc};
		keyword.addKeywordInIndex(nKeyword, currentIndex);
	}
	
	// SORT FUNCTION
	// Initialisation
	queryObj.info.sort = [];

	queryObj.addSort = function () {
		queryObj.info.sort.push({"field":"",type:true});
	}

	queryObj.removeSort = function (index) {
		queryObj.info.sort.splice(index, 1);	
	}

	queryObj.cleanSort = function () {
		queryObj.info.sort = [];	
	}

	queryObj.sortUp = function(index) {
		if (index > 0) {
			var tmp1 = queryObj.info.sort[index];
			var tmp2 = queryObj.info.sort[index - 1];
			queryObj.info.sort[index] = tmp2;
			queryObj.info.sort[index - 1] = tmp1;
		}
	}

	queryObj.sortDown =  function (index)  {
		if (index < queryObj.info.sort.length - 1) {
			var tmp1 = queryObj.info.sort[index];
			var tmp2 = queryObj.info.sort[index + 1];
			queryObj.info.sort[index] = tmp2;
			queryObj.info.sort[index + 1] = tmp1;	
		}
 	}

	function addSortToRequest(request, sort) {
		var i = 0;
		while (i < sort.length) {
			var sortTmp =  ejs.Sort(sort[i].field);
			if (sort[i].type) {
				sortTmp.asc();
			}
			else {
				sortTmp.desc();	
			}
			request.sort(sortTmp);
			i++;
		}
	}

	queryObj.updateDataFromUrl = function () {
		var obj = {simplifiedRequest:"", page:""};
		url.dataToObj(obj);
		for (key in obj) {
			if (typeof(obj[key]) !== "undefined") {
				queryObj.info[key] = obj[key];
			}
		}
	}

	queryObj.updateUrlData = function () {
		var obj = {simplifiedRequest:queryObj.info.simplifiedRequest, page:queryObj.info.page};
		url.addDataFromObj(obj);
	}

	return queryObj;
});