<?php
$ppResourceTemplate = array(
	'localBasePath' => dirname( __FILE__ ),
	'remoteExtPath' => 'SemanticDiscovery',
	'group' => 'ext.semanticdiscovery'
);
$wgResourceModules['ext.discover.css'] = $ppResourceTemplate + array(
        'styles' => array('modules/css/discover.css'=>array('media'=>'screen')),
        'position'=>'top'
 );
$wgResourceModules += array(
	'ext.discover.js' => $ppResourceTemplate + array(
        'scripts' => array( 'modules/js/jquery.discover.js' ),
        'dependencies' => array( 'jquery','jquery.collapse' ),
        'position'=>'top'
	),
	'jquery.collapse' => $ppResourceTemplate + array(
	    'scripts' => array( 'modules/js/jquery.collapse.js' ),
	    'dependencies' => array( 'jquery' ),
	    'position'=>'top'
	)
);

$wgHooks['BeforePageDisplay'][] = 'SemanticDiscovery::init';
$wgHooks['ParserFirstCallInit'][] = 'SemanticDiscovery::registerFunction';
$wgHooks['LanguageGetMagic'][] = 'SemanticDiscovery::registerLanguage';

class SemanticDiscovery{
	public static function init($out){
		$out->addModules( 'ext.discover.css' );
		$out->addModules( 'ext.discover.js' );
		
		return true;
	}
	public static function registerFunction(&$parser){
		$parser->setHook( 'discover', 'SemanticDiscovery::discoverTag' );
		//$parser->setFunctionHook('discover', 'SemanticDiscovery::discover');
		return true;
	}
	
	public static function registerLanguage(&$magicWords){
		$magicWords['discover'] = array(0,'discover');
		return true;
	}
	
	//function to output script tag from content passed to <discover>
	public static function discoverTag($json, $args, $parser){
		
		$id = 'discover-'.uniqid();
		//strip any bullshit mediawiki inserts
		/*if( preg_match('~{(.+[\n]*)+}~ui', $input, $matches) ){
			$json=$matches[0];
		}else{
			return 'Invalid input to discover. Please supply a JSON object of options.';
		}*/
		
		if(preg_match('~(function(?: [\w]+)?\([^)]*\))~',$json)){
			return 'For security, abitrary javascript functions are not enabled. To customize Discover output, please create a static settings file.';
		}
		//echo $json; exit;
		if(isset($args['src'])){
			//potential vunerability! ensure source file is a local resource!
			$filepath = dirname(dirname(__DIR__)).'/'.$args['src'];
			if(!is_file($filepath)){
				return 'Could note locate settings file: '.$filepath;
			}
			$json = file_get_contents($args['src']);
		}
		//$json = str_replace('<p>','',$json);
		//$json = str_replace("\n",'',$json);
		
		

		$return = '<div class="discover" id="'.$id.'"></div><script type="text/javascript">$(function(){ $("#'.$id.'").discover('.$json.'); })</script>';
		
		//global $wgOut;
		//$return=$wgOut->addHTML($return);
		
		
		return array( $return, 'noparse' => true, 'isHTML' => true, "markerType" => 'nowiki' );
	}
	
	//function to output script tag from arguments passed to {{#discover: }}
	public static function discoverFunction($parser){
		$args = func_get_args();
		array_shift($args);
		$args = self::arrayFromParserArgs($args);
		//convert args to json object
		$json = array();
		foreach($args as $arg => $v){
			$json[] = $arg.=':'.$v;
		}
		$json = '{'.implode(",",$json).'}';
		$test = json_decode($json,true);
		return;
		print_r($test); exit;
		echo $json;exit;
		/*if($args['collapse']===true){
			$out->addModules( 'jquery.' );
		}*/
		$id = 'discover-'.uniqid();
		$return = '<div class="discover" id="'.$id.'"></div><script type="text/javascript">$(function(){ $("#'.$id.'").discover('.$json.'); })</script>';
		
		return array( $return, 'noparse' => true, 'isHTML' => true );
	}
	public static function arrayFromParserArgs($args){
		$array_args = array();
		foreach($args as $k => $v){
			$temp = mb_split('=',$v); 
			if(count($temp)===1 && !empty($temp[0]) ){
				$array_args[] = $temp[0];
			}else if(count($temp)===2){
				$array_args[$temp[0]] = $temp[1];
			}else{
			 	// any way to report this as an error?
			}
		}
		return $array_args;
	}
}