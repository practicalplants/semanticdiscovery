/* 
Discover filtered results by Andru Vallance for PracticalPlants.org
Released under a Creative Commons Attribution-Sharealike license.
*/
(function($){
	
	var discover = this,
		elements = {}, //object of dom elements
		filters = [], //array of filter objects
		property_map = [], //map property names to their index in the filter objects array
		results = null,
		settings = {
			query: {
				initial: '',
				conditions: '',
				printouts: [],
				parameters: [],
				limit:40
			},
			class_prefix: 'discover',
			api_url: '/w/api.php?',
			filters:[],
			collapse: true,
			debug: false
		},
		options = {
			
		};
	
	var initial = true; //boolean to know whether a query is the initial query or not
	var events = { afterUpdate: [], afterDrawUpdate:[] };
	var methods = {
		
		setOptions: function(opts){
			options = methods.recursiveMerge(settings,opts); 
		},
		init: function(opts){
			if(!$(this).hasClass('discover'))
				$(this).addClass('discover');
		
			methods.setOptions(opts);
			
			if(options.events!==undefined){
				for(var key in options.events){
					methods.addEvent(key,options.events[key]);
				}
			}
			
			log('Options',options);
			if($(this).length === 0)
				$.error('Could not find container element');
			elements.container = $(this);
			if(options.filters.length === 0)
				$.error('No filters supplied');
			//filters = options.filters;
			for(var i=0,l=options.filters.length, f;i<l;i++){ 
				f = options.filters[i];
				property_map.push(f.property); //create an array to easily look up the index of a filter by it's property name			
				
				switch(true){
					case f.properties!==undefined:
						filters.push(new filter_types.propertiesExist(f));
					break;
					case f.property!==undefined && f.values!==undefined:
						filters.push(new filter_types.propertyValues(f));
					break;
					case f.property!==undefined && f.values===undefined:
						filters.push(new filter_types.propertyExists(f));
					break;
				}
			}
			elements.container.empty();
			elements.filters = $('<div class="discover-filters"></div>');
			elements.info = $('<div class="discover-info"></div>');
			elements.results = $('<div class="discover-results"></div>');
			elements.loader = $('<div class="discover-loader"></div>').hide();
			elements.container
				.append(elements.filters)
				.append(elements.loader)
				.append(elements.info)
				.append(elements.results);
			
			methods.drawFilters();
			methods.update();		
		},
		
		drawFilters: function(){
			var f, el, input, label;
			elements.filters.empty();
			for(var i=0, l=filters.length; i<l; i++){			
				elements.filters.append(filters[i].draw());
			}
			if(options.collapse===true && typeof $().collapse==='function'){
				elements.filters.collapse({
					head:'.discover-filter-header',
					group:'.discover-filter-body',
				    show: function() {
				        this.animate({
				            opacity: 'toggle', 
				            height: 'toggle'
				        }, 300);
				    },
				    hide: function(){
				    	this.animate({
				    	    opacity: 'toggle', 
				    	    height: 'toggle'
				    	}, 300);
				    }
				});
				$('.discover-filter-header').addClass('collapser');
				$('.discover-filter-body').addClass('collapsee');
			}
		},
		
		setFilter: function(){
			
		},
		
		update: function(){
			log('Update, filters',filters);
			var url = options.api_url+'format=json&action=ask&query=',
				conditions = options.query.conditions,
				printouts = options.query.printouts,
				params = options.query.parameters,
				limit = options.query.limit,
				vals_enabled = [];
				
			for(var i=0,l=filters.length;i<l;i++){
				conditions+=filters[i].getConditions();
			}
			
			elements.results.addClass('loading');
			elements.loader.show();
			
			if(initial && options.query.initial !==undefined)
				conditions+=options.query.initial;
			
			/*We need to substitute + since it has special meaning in an SMW query, but as an 
			url encoded space character would be just decoded as a space on the other end*/
			url+= escape( conditions ).replace(/\+/g,'%2B'); 
			
			if(printouts.length > 0)
				url+= escape('|?'+ printouts.join('|?') );
			if(params.length > 0)
				url+= escape('|'+ params.join('|') );
			url+='|limit%3D'+limit;
			log('Conditions: ',conditions);
			log('Printouts: ',printouts);
			log('Params: ',params);
			log('URL: ', url);
			$.get(url).then(
				function(data){
					log('Result:',data);
					if(data && data.query && data.query.results){
						methods.drawUpdate(data.query.results);
					}
				},
				function(){ 
					$.error('Ajax request failed'); 
				}
			);
			//trigger afterupdate event
			methods.dispatchEvent('afterUpdate');
			
			initial = false; //initial query performed
		},
		
		drawUpdate: function(results){
		
			elements.results.removeClass('loading');
			elements.loader.hide();
			
			elements.results.empty();
			elements.info.empty();
			
			var item, items=[], printout, printouts, result, print_out_values, i, l;
			
			for(var key in results){
				item = templates.result(results[key]);
				items.push(item);
				elements.results.append( item );
			}
			//format=count is broken for the query api, so if we have the same amount of results as the limit, assume there are more results available
			if(items.length === options.query.limit){
				elements.info.append( templates.more_results() );
			}else if(items.length===0){
				elements.info.append( templates.no_results() );
			}else{
				elements.info.append( templates.result_count(items.length) );
			}
			methods.dispatchEvent('afterDrawUpdate');
		},
		
		
		/* Used by setOptions to recursively merge an object */
		clone: function(object) {
			  var newObj = (object instanceof Array) ? [] : {};
			  for (var i in object) {
			    //if (i == 'clone') continue;
			    if (object[i] && typeof this[i] == "object") {
			      newObj[i] = this.clone(object[i]);
			    } else {
					newObj[i] = object[i];
				}
			  }
			  return newObj;
		},
		
		recursiveMerge: function(left, right){
			var newleft = methods.clone(left);
			for(var prop in right){
				if(newleft[prop] && typeof right[prop] == 'object' &&  !(right[prop] instanceof Array) ){
					newleft[prop] = methods.recursiveMerge(newleft[prop],right[prop]);
				}else{
					newleft[prop] = right[prop];
				}
			}
			return newleft;
		},
		
		addEvent: function(event,handler){
			if(handler instanceof Array){
				for(var i=0,l=handler.length;i<l;i++){
					methods.addEvent(event,handler[i]);
				}
				return;
			}
			if(typeof handler === 'function'){
				events[event].push(handler);
			}
		},
		
		dispatchEvent: function(event,data){
			for(var i=0,l=events[event].length;i<l;i++){
				//call the event handler in it's existing scope
				events[event][i].call(events[event][i],data);
			}
		}
		
	};
	
	var templates={
		filter_header:function(title){ 
			return $('<h3 class="discover-filter-header"></h3>').text(title); 
		},
		filter_body:function(filter_els,filter_name){ 
			var el = $('<div class="discover-filter-body"></div>');
			if(filter_name!==undefined)
				el.addClass( filter_name.toLowerCase().replace(/\s/g,'_') );
			for(var i=0,l=filter_els.length;i<l;i++){
				el.append(filter_els[i]);
			}
			return el;
		},
		result: function(result){
			if(options.templates.result !==undefined )
				return options.templates.result(result,templates);
			var item = $('<div class="discover-result-item"></div>');
			item.append( '<a href="'+result.fullurl+'" class="title">'+result.fulltext+'</a>' );
			if(typeof result.printouts=='object'){
				printouts = [];
				for(key in result.printouts){
					print_out_values = [];
					for(i=0,l=result.printouts[key].length; i<l; i++){
						print_out_values.push( result.printouts[key][i].fulltext );
					}
					if(templates.printout_property[key]!==undefined){
						printout = templates.printout_property[key](print_out_values);
					}else{
						printout = templates.printout(key,print_out_values);
					}
					printouts.push(printout);									
				}
			}
			item.append( templates.printouts(printouts) );
			return item;
		},
		printouts:function(printouts){ 
			var el = $('<div class="discover-printouts"></div>');
			for(var i=0,l=printouts.length;i<l;i++){
				el.append(printouts[i]);
			}
			return el;
		},
		printout:function(property,values){
			if(templates.printout_property[property]!==undefined)
				return templates.printout_property[property](values);
			var printout = $('<div class="discover-printout discover-printout-'+property.toLowerCase().replace(/( )/g,'_')+'"></div>');
			printout.text(values.join(', '));
			return printout;
		},
		printout_property:{},
		no_results: function(){ return $('<div>We couldn\'t find any plants with the properties you searched for. Try being less specific.</div>') },
		more_results: function(){ return $('<div>There are more results available. Please refine your search to be more specific.</div>') },
		result_count: function(count){ return $('Your search returned '+count+' plants.') }
	};
	
	
	var filter_types = {
	
		//list defined values for a single property
		propertyValues: function(filter){
			if(filter.property===undefined || filter.values===undefined)
				$.error('Property name cannot be undefined');
			var f = filter,
				label = f.label!==undefined ? f.label : f.property,
				el_class = 'filter-'+label.toLowerCase().replace(/\s/g,'_'),
				el = $('<div class="discover-filter discover-filter-propertyvalues '+el_class+'"></div>'),
				state = [];
				
			for(i=0,l=f.values.length;i<l;i++){
				state.push(false);
			}
				
			var events = {
				inputChange: function(ev){
					//log(arguments);
					var $this = $(this);
					log('Input change: ',$this.data('property'),$this.val());
					log($this.val(),f.values,f);
					state[ f.values.indexOf($this.val()) ] = $this.attr('checked') ? true : false;
					methods.update();
				}
			}
				
			this.draw = function(){
				el.empty();
				var label = f.label!==undefined ? f.label : f.property,
					header = templates.filter_header( label ),
					filter_els = [];
				
				if(f.collapsed===false)
					header.addClass('active');
				el.append(header);
				for(var i=0, l=f.values.length, label;i<l;i++){
					label = f.labels===undefined ? f.values[i] : f.labels[i];
					input = $('<input type="checkbox">')
						.data('property',f.property)
						.val(f.values[i])
						.change(events.inputChange);
					filter_els.push( $('<label class="discover-filter-checkbox"></label>').append(input).append(label) );
				}
				el.append( templates.filter_body(filter_els,label) );
				return el;
			}
			
			this.getConditions = function(){
				var vals_enabled = [];
				for(i=0,l=state.length;i<l;i++){
					
					if(state[i]===true){
						vals_enabled.push('[['+f.property+'::'+f.values[i]+']]');
					}
				}
				if(vals_enabled.length > 0){
					if(vals_enabled.length > 1){
						return '<q>'+vals_enabled.join(' OR ')+'</q>';
					}else{
						return vals_enabled[0];
					}
				}
				return '';
			}
						
			
		},
		//used by propertyExists and propertiesExists to generate a property checkbox
		singleProperty: function(f){
			if(f.property===undefined)
				$.error('singleProperty: Property name cannot be undefined');
			var el = $('<span></span>'),
				state = false;
			
			var events = {
				inputChange: function(){
					state = $(this).attr('checked') ? true : false;
					if(state===true && $(this).val()!=='true'){
					
					}
					methods.update();
				}
			};
				
			this.draw = function(){
				el.empty();
				var label = f.label!==undefined ? f.label : f.property,
					input, value;
				value = f.value!==undefined ? f.value : 'true';
				input = $('<input type="checkbox">')
						.data('property',f.property)
						.val(value)
						.change(events.inputChange);
				return $('<label class="discover-filter-checkbox"></label>').append(input).append(label);
			}
			
			this.getConditions = function(){
				var value = f.value!==undefined ? f.value : '+'; //%2B is +, if it's not encoded it will be interpreted as a space
				if(state===true){
					return '[['+f.property+'::'+value+']]';
				}
				return '';
			}
		},
		
		//checkbox for a single property to filter whether the property is set (with any value)
		propertyExists: function(f){
			if(f.property===undefined)
				$.error('propertyExists: Property name cannot be undefined');
			var label = f.label!==undefined ? f.label : f.property,
				el_class = 'filter-'+label.toLowerCase().replace(/\s/g,'_'),
				el = $('<div class="discover-filter discover-filter-propertyexists"></div>').addClass(el_class),
				state = false,
				filter = new filter_types.singleProperty(f);
			
			
			this.draw = function(){
				el.empty();
				var label = f.label!==undefined ? f.label : f.property,
					header = templates.filter_header(label),
					input;
				if(f.collapsed===false)
					header.addClass('active');
				el.append(header);
				el.append(  );
				el.append( templates.filter_body( filter.draw(),label ) );
				return el;
			}
			
			this.getConditions = function(){
				return filter.getConditions();
			}
		},
		
		//multiple checkboxes, each to filter for the existance of a property (with any value)
		propertiesExist: function(f){
			if(f.properties===undefined)
				$.error('Properties array cannot be undefined');
			var label = f.label!==undefined ? f.label : f.property,
				el_class = 'filter-'+label.toLowerCase().replace(/\s/g,'_'),
				el = $('<div class="discover-filter discover-filter-propertyexists"></div>').addClass(el_class),
				state = [],
				filters = [];
			
			
			for(var i=0,l=f.properties.length,p,single_filter; i<l; i++){
				p = f.properties[i];
				state.push(false);
				single_filter = {property: p};
				if(f.labels!==undefined)
					single_filter.label = f.labels[i];
				if(f.values!==undefined)
					single_filter.value = f.values[i];
				filters.push( new filter_types.singleProperty( single_filter ) );
			}
			
			var events = {
				inputChange: function(){
				
				}
			};
			
			this.draw = function(){
				el.empty();
				var header = templates.filter_header(label),
					filter_els = [],
					input;
				if(f.collapsed===false)
					header.addClass('active');
				el.append(header);
				for(var i=0,l=filters.length;i<l;i++){
					filter_els.push( filters[i].draw() );
				}
				el.append( templates.filter_body(filter_els, label) );
				return el;
			}
			
			this.getConditions = function(){
				var conditions = '';
				for(var i=0,l=filters.length,p;i<l;i++){
					conditions+=filters[i].getConditions();
				}
				return conditions;
			}
		},
		text: function(){}
	};
	
	
	/*var events = {
		inputChange: function(ev){
			//log(arguments);
			var $this = $(this), f;
			log('Input change: ',$this.data('property'),$this.val());
			f = filters[ property_map.indexOf($this.data('property')) ];
			f.state[ f.values.indexOf($this.val()) ] = $this.attr('checked') ? true : false;
			methods.update();
		}	
	};*/
	
	$.fn.discover = function( method ) {
	  	log('discover called with',arguments);
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist' );
		}    
		
		return methods; //allow $('blah').discover().method(args); as well as $('blah').discover('method',args)
	
	};
	
	function log(){
		if(options.debug===true && console!==undefined && typeof console.log==='function'){
			console.log.apply(console,arguments);
		}
	}

})(jQuery);