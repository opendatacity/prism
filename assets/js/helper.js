
$(document).ready(function(){

	/* embed overlay code */
	var $embed_overlay = $('#embed-overlay');

	$('.embed-button').click(function(evt){
		console.log('hey');
		if ($('#embed-overlay:visible').length === 0) {
			$('#embed-overlay').fadeIn('fast');
		}
	});

	var $clickIn = false;
	$('#embed-overlay').click(function(evt){
		if (!$clickIn) {
			$('#embed-overlay').fadeOut('fast');
		}
		$clickIn = false;
	});
	$('#embed-form').click(function(evt){
		$clickIn = true;
	});

	/* embed code*/
	if ($('#embed-form').length) {
		var $f = $('#embed-form');
		var $url = 'http://apps.opendatacity.de/prism/';
		var embedCode = function(){
			var $size = $('input:radio[name=size]:checked',$f).val();
			var $lang = $('input:radio[name=lang]:checked',$f).val();
			$lang = ($lang === "") ? "de" : $lang;
			$size = ($size === "") ? "large" : $size;

			if ($lang == "de") {
				var file   = 'frame.de.html';
			} else {
				var file   = 'frame.en.html';
			}

			$('#embed-size',$f).show();
					switch ($size) {
						case 'large':  var $wh = 'width="520" height="490"'; break;
						case 'medium': var $wh = 'width="480" height="490"'; break;
						case 'small':  var $wh = 'width="360" height="576"'; break;
					}
					var $code = '<iframe src="'+$url+file+'" '+$wh+' scrolling="no" frameborder="0" style="margin:0"></iframe>';
			$('#embed-code', $f).text($code);
		};
		embedCode();
		$(":input", $f).change(function(){
			embedCode();
		});
	}

});
