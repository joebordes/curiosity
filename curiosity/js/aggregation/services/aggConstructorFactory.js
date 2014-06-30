Curiosity.factory('aggConstructor', function(){
	var obj = {};

	obj.Terms = function (agg) {
		var result = ejs.TermsAggregation(agg.name);
		result.field(agg.field);
		if (typeof (agg.size) !== "undefined") 
			result.size(agg.size);
		if (typeof (agg.order) !== "undefined") {
			order = "desc";
			if (agg.orderType)
				order = "asc";			
			result.order(agg.order, order);			
		}
		if (typeof (agg.minDoc) !== "undefined") 
			result.minDocCount(agg.minDoc);
		if (typeof (agg.script) !== "undefined" && agg.script != "") 
			result.script(agg.script);
		if (typeof (agg.include) !== "undefined" && agg.include != "") 
			result.include(agg.include);
		if (typeof (agg.exclude) !== "undefined" && agg.exclude != "") 
			result.exclude(agg.exclude);
		
		for (key in agg.nested) {
			if (agg.nested[key].validate)
				result.agg(obj[agg.nested[key].type](agg.nested[key]));	
		}
		return (result);
	}

	obj.Range = function (agg) {
		var result = ejs.RangeAggregation(agg.name);
		result.field(agg.field); 
		var i = 0;
		if (typeof (agg.intervals) !== "undefined") {
			while (i < agg.intervals.length) {
				var from = null;
				var to = null;
				if (typeof (agg.intervals[i].from) !== "undefined") {
					from = agg.intervals[i].from;
				}
				if (typeof (agg.intervals[i].to) !== "undefined") {
					to = agg.intervals[i].to;
				}
				result.range(from, to);
				i++;
			}
		}
		if (typeof (agg.script) !== "undefined" && agg.script != "") 
			result.script(agg.script);
		for (key in agg.nested) {
			if (agg.nested[key].validate)
				result.agg(obj[agg.nested[key].type](agg.nested[key]));	
		}
		return (result);
	}
	
	function simple(agg, constructor) {
		var result = constructor(agg.name);
		result.field(agg.field); 
		if (typeof (agg.script) !== "undefined" && agg.script != "") 
			result.script(agg.script);
		return (result);
	}

	obj.Avg = function (agg) {
		return (simple(agg, ejs.AvgAggregation));	
	}

	obj.Stats = function (agg) {
		return (simple(agg, ejs.StatsAggregation));
	}

	obj.Max = function (agg) {
		return (simple(agg, ejs.MaxAggregation));
	}

	obj.Min = function (agg) {
		return (simple(agg, ejs.MinAggregation));
	}

	obj.ExtendedStats = function (agg) {
		return (simple(agg,ejs.ExtendedStatsAggregation));
	}

	obj.ValueCount = function (agg) {
		return (simple(agg, ejs.ValueCountAggregation));	
	}

	obj.Sum = function (agg) {
		return (simple(agg, ejs.SumAggregation));
	}

	return obj;
});