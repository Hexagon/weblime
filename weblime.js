function Weblime(destination_id) {

	var 
		dest = null,
		destination = destination_id,
		c = null,
		canvas = null,
		ctx = null,

		ctx_width = 0,
		ctx_height = 0,

		buffer = new Array(),

		cur_row = 0,
		mo_idx = 0,
		cur_col = 0,
		cur_scroll = 0,

		font = "9pt 'Consolas', 'Courier New', Courier, Monospace"
		ln_height = 16,
		ln_width = 0,
		chr_width = 0,

		buffer[0] = '';

	function load_file(data,title) {

		spl = data.split('\r\n');
		spl = data.split('\r');
		spl = data.split('\n');

		buffer = "";

		for(var i = 0;i<spl.length;i++) {
			buffer[i] = spl[i];
		}

		cur_row = 0;
		cur_col = 0;
		cur_scroll = 0;

		window_redraw();			

	}

	function window_init() {

		dest = document.getElementById(destination);
		canvas = document.createElement('canvas');
		canvas.tabIndex = 1; // Fix to allow canvas to receive key events
		dest.appendChild(canvas);
		ctx = canvas.getContext('2d');

		ctx.font = font;
		chr_width = ctx.measureText("a").width;

		window_resize();

	}

	function check_scroll() {
		if(cur_row*ln_height-cur_scroll*ln_height+ln_height*2>ctx_height) {
			var add = Math.ceil((cur_row*ln_height-cur_scroll*ln_height+ln_height*2-ctx_height)/ln_height)
			cur_scroll += add;
			
		}
		if(cur_row*ln_height-cur_scroll*ln_height-ln_height<-ln_height) {
			var add = Math.ceil((cur_row*ln_height-cur_scroll*ln_height)/ln_height);
			cur_scroll += add;
			if( cur_scroll <0 ) cur_scroll = 0;
		}
	}

	function click_handler(e) {

		// Set row
		sel_row = Math.ceil(e.clientY/ln_height)+cur_scroll;
		if(sel_row<=buffer.length) {
			cur_row=sel_row-1;
		} else {
			cur_row=buffer.length-1;
		}

		// Set col
		sel_col = Math.ceil((e.clientX-ln_width-10)/chr_width);
		if(sel_col<=buffer[cur_row].length&&sel_col>0) {
			cur_col=sel_col-1;
		} else {
			cur_col=buffer[cur_row].length;
		}

		window_redraw();
	}

	function move_handler(e) {
		mo_idx = Math.ceil(e.clientY/ln_height);
		if(mo_idx+cur_scroll>buffer.length)mo_idx=buffer.length-cur_scroll;

		window_redraw();
	}

	function syntax_highlight(lang,buf,buf_idx,chr_idx) {
		var override = false;
		var rule = rules[lang];
		var buffer_text = buf[buf_idx];
		for(var i=0;i<rule.length;i++) {
			var cur_rule = rule[i];
			if( !override ) {
				if(cur_rule.start === buffer_text.substr(chr_idx,cur_rule.start.length)) {
					if( !override ) {
						if(cur_rule.override_all) override = true;
						return(cur_rule.color);
					}
				}
				if(chr_idx-cur_rule.end.length>=0 && cur_rule.end === buffer_text.substr(chr_idx-cur_rule.end.length,cur_rule.end.length)) {
					if( !override ) {
						if(cur_rule.override_all) override = true;
						return("rgb(220,220,220)");
					}
				}
			}
		}
	}

	function window_redraw() {

		// Redraw bg
		ctx.fillStyle = "rgb(38,38,32)";
		ctx.fillRect(0, 0, ctx_width, ctx_height);

		// Redraw line-numbering bg
		ctx.font = font;
		ln_width = ctx.measureText(buffer.length).width + 20;
		ctx.fillStyle = "rgb(28,28,22)";
		ctx.fillRect(0, 0, ln_width, ctx_height);

		// Redraw current line number bg
		ctx.fillStyle = "rgb(48,48,48)";
		ctx.fillRect(0,4+cur_row*ln_height-cur_scroll*ln_height, ln_width, ln_height);

		// Redraw mouse over bg
		ctx.fillStyle = "rgb(35,41,41)";
		ctx.fillRect(0,4+mo_idx*ln_height-ln_height, ctx_width, ln_height);
		ctx.fillStyle = "rgb(27,33,33)";
		ctx.fillRect(0,4+mo_idx*ln_height-ln_height, ln_width, ln_height);

		// Redraw current char
		ctx.fillStyle = "rgb(64,64,60)";
		ctx.fillRect(ln_width+10+cur_col*chr_width,4+cur_row*ln_height-cur_scroll*ln_height, chr_width, ln_height);

		// Redraw text
		ctx.fillStyle = "rgb(220,220,220)";
		c=0;
		for(var i=cur_scroll;i<buffer.length;i++) {
			for(var x=0;x<buffer[i].length;x++) {
				var fg_color = syntax_highlight('html',buffer,i,x);
				if(fg_color) ctx.fillStyle = fg_color;
				ctx.fillText(buffer[i][x], ln_width+10+x*chr_width, ln_height+c*ln_height);
			}
			c++;
		}

		// Draw line numbers
		ctx.fillStyle = "rgb(128,128,128)";
		c=0;
		for(var i=cur_scroll;i<buffer.length;i++) {
			ctx.fillText(i+1, 10, ln_height+c*ln_height);

			c++;

		}

	}

	function window_resize() {

		ctx_width = dest.clientWidth;
		ctx_height = dest.clientHeight;

		canvas.width = ctx_width;
		canvas.height = ctx_height;

		ctx.clearRect( 0, 0, ctx.canvas.width, ctx.canvas.height);

		window_redraw();

		check_scroll();

	}

	function insert_char(c) {

		// Inject a single char
		new_char = c;
		t_str_len = buffer[cur_row].length;
		t_before = ''+buffer[cur_row].substr(0,cur_col);
		t_after = ''+buffer[cur_row].substr(cur_col,t_str_len);
		buffer[cur_row] = ''+t_before+new_char+t_after;

		cur_col += 1;

		delete t_str_len,t_before,t_after;
	}
	function keypress_handler(e) {

		// Backspace (and prevent going back on backspace)
		if(e.keyCode==8) {
			// Prevent default browser behaviour when pressing backspace
			e.preventDefault();

			if(cur_col==0) {
				// Append this row to the row above, if there is one
				if(cur_row>0) {
					t_tmp = ''+buffer[cur_row];
					t_pre_len = buffer[cur_row-1].length;
					buffer.splice(cur_row,1);
					cur_row-=1;
					buffer[cur_row] += t_tmp;
					cur_col = t_pre_len;
					delete t_tmp,t_pre_len;
				}
			} else {
				// Remove a single char
				t_str_len = buffer[cur_row].length;
				t_before = ''+buffer[cur_row].substr(0,cur_col-1);
				t_after = ''+buffer[cur_row].substr(cur_col,t_str_len);
				buffer[cur_row] = ''+t_before+t_after;
				cur_col -= 1;
			}
		// Backspace (and prevent going back on backspace)
		} else if(e.keyCode==46 && e.shiftKey == false && e.charCode != 46) {
			e.preventDefault();

			if(cur_col==buffer[cur_row].length) {
				// Append the row below to this row, if there is one
				if(cur_row<buffer.length-1) {
					t_tmp = ''+buffer[cur_row+1];
					buffer.splice(cur_row+1,1);
					buffer[cur_row] += t_tmp;
					delete t_tmp;
				}
			} else {
				// Remove a single char
				t_str_len = buffer[cur_row].length;
				t_before = ''+buffer[cur_row].substr(0,cur_col);
				t_after = ''+buffer[cur_row].substr(cur_col+1,t_str_len);
				buffer[cur_row] = ''+t_before+t_after;
			}

		// Return (Special handling)
		} else if(e.keyCode == 13) {
			e.preventDefault();

			t_str_len = buffer[cur_row].length;
			t_before = ''+buffer[cur_row].substr(0,cur_col);
			t_after = ''+buffer[cur_row].substr(cur_col,t_str_len);

			buffer.splice(cur_row+1,0,t_after);
			buffer[cur_row] = t_before;
			cur_row += 1;
			cur_col = 0;

			delete t_after,t_str_len;

		// Home-key (Special handling)
		} else if(e.keyCode == 36 && e.shiftKey == false) {
			e.preventDefault();

			cur_col = 0;

		// End-key (Special handling)
		} else if(e.keyCode == 35 && e.shiftKey == false) {
			e.preventDefault();

			cur_col = buffer[cur_row].length;

		// Up-key (Special handling)
		} else if(e.keyCode == 38 && e.shiftKey == false) {
			e.preventDefault();

			if(cur_row>0) cur_row -= 1;
			if(cur_col>buffer[cur_row].length) cur_col = buffer[cur_row].length;

		// Down-key (Special handling)
		} else if(e.keyCode == 40 && e.shiftKey == false) {
			e.preventDefault();

			if(cur_row<buffer.length-1) cur_row += 1;
			if(cur_col>buffer[cur_row].length) cur_col = buffer[cur_row].length;

		// PgUp-key (Special handling)
		} else if(e.keyCode == 33 && e.shiftKey == false) {
			e.preventDefault();

			cur_row -= Math.floor(ctx_height/ln_height);
			cur_scroll -= Math.floor(ctx_height/ln_height);
			if(cur_row<0) cur_row = 0;
			if(cur_scroll<0) cur_scroll = 0;

			if(cur_col>buffer[cur_row].length) cur_col = buffer[cur_row].length;

		// PgDown-key (Special handling)
		} else if(e.keyCode == 34 && e.shiftKey == false) {

			e.preventDefault();

			cur_row += Math.floor(ctx_height/ln_height);
			cur_scroll += Math.floor(ctx_height/ln_height);
			if(cur_row>buffer.length-1) cur_row = buffer.length-1;
			if(cur_scroll+Math.floor(ctx_height/ln_height)>buffer.length-1) cur_scroll = Math.floor(buffer.length-ctx_height/ln_height);
			if(cur_scroll<0) cur_scroll = 0;

			if(cur_col>buffer[cur_row].length) cur_col = buffer[cur_row].length;


		// Left-key (Special handling)
		} else if(e.keyCode == 37 && e.shiftKey == false) {
			e.preventDefault();

			if(cur_col>0) {
				cur_col -= 1;
			} else {
				if(cur_row>0) {
					cur_row -= 1;
				 	cur_col = buffer[cur_row].length;
				 }
			}

		// Right-key (Special handling)
		} else if(e.keyCode == 39 && e.shiftKey == false) {
			e.preventDefault();

			if(cur_col<buffer[cur_row].length) {
				cur_col += 1;
			} else {
				if(cur_row<buffer.length-1) {
					cur_col = 0;
				 	cur_row += 1;
				 }
			}

		// Return (Special handling)
		} else if(e.keyCode == 9 && e.shiftKey == false) {
			e.preventDefault();

			insert_char(" ");
			insert_char(" ");
			insert_char(" ");
			insert_char(" ");

		// Other chars (when charCode is existing)
		} else if(e.charCode) {
			e.preventDefault();

			insert_char(String.fromCharCode(e.charCode));

		}

		check_scroll();

		window_redraw();

	}

	window_init();

	// Event handlers
	dest.addEventListener('resize', window_resize);
	canvas.addEventListener('keypress', function(e) { 	if(e.charCode) keypress_handler(e);  						});
	canvas.addEventListener('keydown', function(e) { 	if(e.keyCode&&e.keyCode!=e.charCode) keypress_handler(e);	}); // Keypress does not capture backspace
	canvas.addEventListener('click', function(e) {	click_handler(e); 											});
	canvas.addEventListener('mousemove', function(e) {	move_handler(e); 											});
	

	function handleDragOver(evt) {
		evt.stopPropagation();
		evt.preventDefault();
		evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
	}

	function handleFileSelect(evt) {

		evt.stopPropagation();
		evt.preventDefault();

		var files = evt.dataTransfer.files; // FileList object

		if(files.length>1) {
			alert('Only one file at time please.');
			return false;
		}
		if(files.length==0) {
			alert('This is wierd.');
			return false;
		}

		if(f = files[0]) {
			
			// Only process text files.
			//if (!f.type.match('text.*')) {
			//		alert('Only text-files are supported.');
			//		return false;
			//}

			var reader = new FileReader();

			// Closure to capture the file information.
			reader.onload = function(theFile) {
				load_file(theFile.target.result,f.name);
			};
			
			reader.readAsText(f);
		}

		return false;
	};

	// Setup the dnd listeners.
	dest.addEventListener('dragover', handleDragOver, false);
	dest.addEventListener('drop', handleFileSelect, false);

}
