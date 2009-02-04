var SCHEMA_VERSION = 3;

var offline_mode = false;
var store = false;
var localServer = false;
var db = false;

function view_offline(id, feed_id) {
	try {

		enableHotkeys();
		showArticleInHeadlines(id);

		db.execute("UPDATE articles SET unread = 0 WHERE id = ?", [id]);

		var rs = db.execute("SELECT * FROM articles WHERE id = ?", [id]);

		if (rs.isValidRow()) {

			var tmp = "<div class=\"postReply\">";

			tmp += "<div class=\"postHeader\" onmouseover=\"enable_resize(true)\" "+
				"onmouseout=\"enable_resize(false)\">";

			tmp += "<div class=\"postDate\">"+rs.fieldByName("updated")+"</div>";

			if (rs.fieldByName("link") != "") {
				tmp += "<div clear='both'><a target=\"_blank\" "+
					"href=\"" + rs.fieldByName("link") + "\">" +
					rs.fieldByName("title") + "</a></div>";
			} else {
				tmp += "<div clear='both'>" + rs.fieldByName("title") + "</div>";
			}

			tmp += "<div style='float : right'> "+
				"<img src='images/tag.png' class='tagsPic' alt='Tags' title='Tags'>";
			tmp += rs.fieldByName("tags");
			tmp += "</div>";

			tmp += "<div clear='both'>"+
				"<a target=\"_blank\" "+
					"href=\"" + rs.fieldByName("comments") + "\">" +
					__("comments") + "</a></div>";

			tmp += "</div>";

			tmp += "<div class=\"postContent\">"
			tmp += rs.fieldByName("content");
			tmp += "</div>";

			tmp += "</div>";

			render_article(tmp);
			update_local_feedlist_counters();
		}

		rs.close();

		return false;

	} catch (e) {
		exception_error("view_offline", e);
	}
}

function viewfeed_offline(feed_id, subop, is_cat, subop_param, skip_history, offset) {
	try {
		notify('');

		if (!offset) offset = 0;

		loading_set_progress(100);

		clean_feed_selections();
	
		setActiveFeedId(feed_id, is_cat);

		if (!is_cat) {
			var feedr = document.getElementById("FEEDR-" + feed_id);
			if (feedr && !feedr.className.match("Selected")) {	
				feedr.className = feedr.className + "Selected";
			} 
		} else {
			var feedr = document.getElementById("FCAT-" + feed_id);
			if (feedr && !feedr.className.match("Selected")) {	
				feedr.className = feedr.className + "Selected";
			} 
		}

		disableContainerChildren("headlinesToolbar", false);
		Form.enable("main_toolbar_form");

		var f = document.getElementById("headlines-frame");
		try {
			if (reply.offset == 0) { 
				debug("resetting headlines scrollTop");
				f.scrollTop = 0; 
			}
		} catch (e) { };


		var container = document.getElementById("headlines-frame");

		var tmp = "";

		rs = db.execute("SELECT title FROM feeds WHERE id = ?", [feed_id]);

		if (rs.isValidRow() || feed_id == -1 || feed_id == -4) {

			feed_title = rs.field(0);

			if (feed_id == -1) {
				feed_title = __("Starred articles");
			}

			if (feed_id == -4) {
				feed_title = __("All articles");
			}

			if (offset == 0) {
				tmp += "<div id=\"headlinesContainer\">";
		
				tmp += "<div class=\"headlinesSubToolbar\">";
				tmp += "<div id=\"subtoolbar_ftitle\">";
				tmp += feed_title;
				tmp += "</div>";

				var sel_all_link = "javascript:selectTableRowsByIdPrefix('headlinesList', 'RROW-', 'RCHK-', true, '', true)";
				var sel_unread_link = "javascript:selectTableRowsByIdPrefix('headlinesList', 'RROW-', 'RCHK-', true, 'Unread', true)";
				var sel_none_link = "javascript:selectTableRowsByIdPrefix('headlinesList', 'RROW-', 'RCHK-', false)";
				var sel_inv_link = "javascript:invertHeadlineSelection()";

				tmp += __('Select:')+
					" <a href=\""+sel_all_link+"\">"+__('All')+"</a>, "+
					"<a href=\""+sel_unread_link+"\">"+__('Unread')+"</a>, "+
					"<a href=\""+sel_inv_link+"\">"+__('Invert')+"</a>, "+
					"<a href=\""+sel_none_link+"\">"+__('None')+"</a>";
	
				tmp += "&nbsp;&nbsp;";
	
				tmp += "</div>";
	
				tmp += "<div id=\"headlinesInnerContainer\" onscroll=\"headlines_scroll_handler()\">";
	
				tmp += "<table class=\"headlinesList\" id=\"headlinesList\" cellspacing=\"0\">";
			
			}
	
			var limit = 30;
		
			var toolbar_form = document.forms["main_toolbar_form"];
			
			var limit = toolbar_form.limit[toolbar_form.limit.selectedIndex].value;
			var view_mode = toolbar_form.view_mode[toolbar_form.view_mode.selectedIndex].value;

			var limit_qpart = "";
			var strategy_qpart = "";
			var mode_qpart = "";

			if (limit != 0) {
				limit_qpart = "LIMIT " + limit;
			}

			if (view_mode == "all_articles") {
				mode_qpart = "1";
			} else if (view_mode == "adaptive") {
				if (get_local_feed_unread(feed_id) > 0) {
					mode_qpart = "unread = 1";
				} else {
					mode_qpart = "1";
				}
			} else if (view_mode == "marked") {
				mode_qpart = "marked = 1";
			} else if (view_mode == "unread") {
				mode_qpart = "unread = 1";
			} else {
				mode_qpart = "1";
			}

			if (feed_id > 0) {
				strategy_qpart = "feed_id = " + feed_id;
			} else if (feed_id == -1) {
				strategy_qpart = "marked = 1";
			} else if (feed_id == -4) {
				strategy_qpart = "1";
			}				

			var query = "SELECT * FROM articles WHERE " +
				strategy_qpart +
				" AND " + mode_qpart + 
				" ORDER BY updated DESC "+
				limit_qpart;

			var rs = db.execute(query);

			var line_num = 0;

			while (rs.isValidRow()) {

				var id = rs.fieldByName("id");
				var feed_id = rs.fieldByName("feed_id");

				var marked_pic;
	
				var row_class = (line_num % 2) ? "even" : "odd";

				if (rs.fieldByName("unread") == "1") {
					row_class += "Unread";
				}
	
				if (rs.fieldByName("marked") == "1") {
					marked_pic = "<img id=\"FMPIC-"+id+"\" "+
						"src=\"images/mark_set.png\" class=\"markedPic\""+
						"alt=\"Unstar article\" onclick='javascript:tMark("+id+")'>";
				} else {
					marked_pic = "<img id=\"FMPIC-"+id+"\" "+
						"src=\"images/mark_unset.png\" class=\"markedPic\""+
						"alt=\"Star article\" onclick='javascript:tMark("+id+")'>";
				}

				var mouseover_attrs = "onmouseover='postMouseIn($id)' "+
					"onmouseout='postMouseOut($id)'";
	
				tmp += "<tr class='"+row_class+"' id='RROW-"+id+"' "+mouseover_attrs+">";
				
				tmp += "<td class='hlUpdPic'> </td>";

				tmp += "<td class='hlSelectRow'>"+
					"<input type=\"checkbox\" onclick=\"tSR(this)\"	id=\"RCHK-"+id+"\"></td>";
				
				tmp += "<td class='hlMarkedPic'>"+marked_pic+"</td>";
	
				tmp += "<td onclick='view("+id+","+feed_id+")' "+
					"class='hlContent' valign='middle'>";
	
				tmp += "<a target=\"_blank\" id=\"RTITLE-$id\" href=\"" + 
					rs.fieldByName("link") + "\"" +
					"onclick=\"return view("+id+","+feed_id+");\">"+
					rs.fieldByName("title");

				var content_preview = truncate_string(strip_tags(rs.fieldByName("content")), 
					100);

				tmp += "<span class=\"contentPreview\"> - "+content_preview+"</span>";

				tmp += "</a>";

				tmp += "</td>";
	
				tmp += "<td class=\"hlUpdated\" onclick='view("+id+","+feed_id+")'>"+
					"<nobr>"+rs.fieldByName("updated").substring(0,16)+"</nobr></td>";

				tmp += "</tr>";

				rs.next();
				line_num++;
			}

			rs.close();
	
			if (offset == 0) {
				tmp += "</table>";
				tmp += "</div></div>";
			}
	
			if (offset == 0) {
				container.innerHTML = tmp;
			} else {
				var ids = getSelectedArticleIds2();
		
				//container.innerHTML = container.innerHTML + tmp;
	
				for (var i = 0; i < ids.length; i++) {
					markHeadline(ids[i]);
				}
			}
		}

		remove_splash();


	} catch (e) {
		exception_error("viewfeed_offline", e);
	}
}

function render_offline_feedlist() {
	try {
		var tmp = "<ul class=\"feedList\" id=\"feedList\">";

		var unread = get_local_feed_unread(-4);

		global_unread = unread;
		updateTitle();

		tmp += printFeedEntry(-4, __("All articles"), "feed", unread,
			"images/tag.png");

		var unread = get_local_feed_unread(-1);

		tmp += printFeedEntry(-1, __("Starred articles"), "feed", unread,
			"images/mark_set.png");

		tmp += "<li><hr/></li>";

		var rs = db.execute("SELECT feeds.id,feeds.title,has_icon,COUNT(articles.id) "+
			"FROM feeds LEFT JOIN articles ON (feed_id = feeds.id) "+
			"WHERE unread = 1 OR unread IS NULL GROUP BY feeds.id "+
			"ORDER BY feeds.title");

		while (rs.isValidRow()) {

			var id = rs.field(0);
			var title = rs.field(1);
			var has_icon = rs.field(2);
			var unread = rs.field(3);

			var icon = "";

			if (has_icon) {
				icon = "icons/" + id + ".ico";
			}


			var feed_icon = "";

			var row_class = "feed";

			if (unread > 0) {
				row_class += "Unread";
				fctr_class = "feedCtrHasUnread";
			} else {
				fctr_class = "feedCtrNoUnread";
			}

			tmp += printFeedEntry(id, title, "feed", unread, icon);

			rs.next();
		}

		rs.close();

		tmp += "</ul>";

		render_feedlist(tmp);
	} catch (e) {
		exception_error("render_offline_feedlist", e);
	}
}

function init_offline() {
	try {
		offline_mode = true;

		Element.hide("dispSwitchPrompt");
		Element.hide("feedBrowserPrompt");
		Element.hide("quickMenuChooser");

		var tb_form = document.getElementById("main_toolbar_form");

		Element.hide(tb_form.update);

		var rs = db.execute("SELECT key, value FROM init_params");

		while (rs.isValidRow()) {
			init_params[rs.field(0)] = rs.field(1);
			rs.next();
		}

		rs.close();

		render_offline_feedlist();
		remove_splash();
	} catch (e) {
		exception_error("init_offline", e);
	}
}

function offline_download_parse(stage, transport) {
	try {
		if (transport.responseXML) {

			if (stage == 0) {

				var feeds = transport.responseXML.getElementsByTagName("feed");

				if (feeds.length > 0) {
					db.execute("DELETE FROM feeds");
				}

				for (var i = 0; i < feeds.length; i++) {
					var id = feeds[i].getAttribute("id");
					var has_icon = feeds[i].getAttribute("has_icon");
					var title = feeds[i].firstChild.nodeValue;
	
					db.execute("INSERT INTO feeds (id,title,has_icon)"+
						"VALUES (?,?,?)",
						[id, title, has_icon]);
				}
		
				window.setTimeout("update_offline_data("+(stage+1)+")", 60*1000);
			} else {

				var articles = transport.responseXML.getElementsByTagName("article");

				var articles_found = 0;

				for (var i = 0; i < articles.length; i++) {					
					var a = eval("("+articles[i].firstChild.nodeValue+")");
					articles_found++;
					if (a) {

						var date = new Date();
						var ts = Math.round(date.getTime() / 1000);

						db.execute("DELETE FROM articles WHERE id = ?", [a.id]);
						db.execute("INSERT INTO articles "+
						"(id, feed_id, title, link, guid, updated, content, "+
							"unread, marked, tags, added, comments) "+
						"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
							[a.id, a.feed_id, a.title, a.link, a.guid, a.updated, 
								a.content, a.unread, a.marked, a.tags, ts,
								a.comments]);

					}
				}

				if (articles_found > 0) {
					window.setTimeout("update_offline_data("+(stage+1)+")", 60*1000);
				} else {
					window.setTimeout("update_offline_data(0)", 1800*1000);

					var date = new Date();
					var ts = Math.round(date.getTime() / 1000);

					db.execute("DELETE FROM articles WHERE added < ? - 2592000", [ts]);

				}
			}

		}
	} catch (e) {
		exception_error("offline_download_parse", e);
	}
}

function update_offline_data(stage) {
	try {

		if (!stage) stage = 0;

		debug("update_offline_data: stage " + stage);

//		notify_progress("Loading, please wait... (" + stage +")", true);

		var query = "backend.php?op=rpc&subop=download&stage=" + stage;

		var rs = db.execute("SELECT MAX(id), MIN(id) FROM articles");

		if (rs.isValidRow() && rs.field(0)) {
			var offline_dl_max_id = rs.field(0);
			var offline_dl_min_id = rs.field(1);

			query = query + "&cidt=" + offline_dl_max_id;
			query = query + "&cidb=" + offline_dl_min_id;
		}

		rs.close();

		new Ajax.Request(query, {
			onComplete: function(transport) { 
				offline_download_parse(stage, transport);				
				debug("update_offline_data: done " + stage);
			} });

	} catch (e) {
		exception_error("initiate_offline_download", e);
	}
}

function set_feedlist_counter(id, ctr) {
	try {

		var feedctr = document.getElementById("FEEDCTR-" + id);
		var feedu = document.getElementById("FEEDU-" + id);
		var feedr = document.getElementById("FEEDR-" + id);

		if (feedctr && feedu && feedr) {

			var row_needs_hl = (ctr > 0 && ctr > parseInt(feedu.innerHTML));

			feedu.innerHTML = ctr;

			if (ctr > 0) {					
				feedctr.className = "feedCtrHasUnread";
				if (!feedr.className.match("Unread")) {
					var is_selected = feedr.className.match("Selected");
	
					feedr.className = feedr.className.replace("Selected", "");
					feedr.className = feedr.className.replace("Unread", "");
	
					feedr.className = feedr.className + "Unread";
	
					if (is_selected) {
						feedr.className = feedr.className + "Selected";
					}	
					
				}

				if (row_needs_hl) { 
					new Effect.Highlight(feedr, {duration: 1, startcolor: "#fff7d5",
						queue: { position:'end', scope: 'EFQ-' + id, limit: 1 } } );
				}
			} else {
				feedctr.className = "feedCtrNoUnread";
				feedr.className = feedr.className.replace("Unread", "");
			}			
		}

	} catch (e) {
		exception_error("set_feedlist_counter", e);
	}
}

function update_local_feedlist_counters() {
	try {
		if (!db) return;

		var rs = db.execute("SELECT feeds.id,COUNT(articles.id) "+
			"FROM feeds LEFT JOIN articles ON (feed_id = feeds.id) "+
			"WHERE unread = 1 OR unread IS NULL GROUP BY feeds.id "+
			"ORDER BY feeds.title");

		while (rs.isValidRow()) {
			var id = rs.field(0);
			var ctr = rs.field(1);

			set_feedlist_counter(id, ctr);

			rs.next();
		}

		rs.close();

		set_feedlist_counter(-4, get_local_feed_unread(-4));
		set_feedlist_counter(-1, get_local_feed_unread(-1));

		hideOrShowFeeds(getInitParam("hide_read_feeds") == 1);

		global_unread = get_local_feed_unread(-4);
		updateTitle();

	} catch (e) {
		exception_error("update_local_feedlist_counters", e);
	}
}

function get_local_feed_unread(id) {
	try {
		var rs;

		if (id == -4) {
			rs = db.execute("SELECT SUM(unread) FROM articles");
		} else if (id == -1) {
			rs = db.execute("SELECT SUM(unread) FROM articles WHERE marked = 1");
		} else {
			rs = db.execute("SELECT SUM(unread) FROM articles WHERE feed_id = ?", [id]);
		}

		var a = false;

		if (rs.isValidRow()) {
			a = rs.field(0);
		} else {
			a = 0;
		}

		rs.close();

		return a;

	} catch (e) {
		exception_error("get_local_feed_unread", e);
	}
}

function init_gears() {
	try {

		if (window.google && google.gears) {
			localServer = google.gears.factory.create("beta.localserver");
			store = localServer.createManagedStore("tt-rss");
			db = google.gears.factory.create('beta.database');
			db.open('tt-rss');

			db.execute("CREATE TABLE IF NOT EXISTS version (schema_version text)");

			var rs = db.execute("SELECT schema_version FROM version");

			var version = "";

			if (rs.isValidRow()) {
				version = rs.field(0);
			}

			rs.close();

			if (version != SCHEMA_VERSION) {
				db.execute("DROP TABLE IF EXISTS init_params");
				db.execute("DROP TABLE IF EXISTS cache");
				db.execute("DROP TABLE IF EXISTS feeds");
				db.execute("DROP TABLE IF EXISTS articles");
				db.execute("DROP TABLE IF EXISTS version");
				db.execute("CREATE TABLE IF NOT EXISTS version (schema_version text)");
				db.execute("INSERT INTO version (schema_version) VALUES (?)", 
					[SCHEMA_VERSION]);
			}

			db.execute("CREATE TABLE IF NOT EXISTS init_params (key text, value text)");

			db.execute("CREATE TABLE IF NOT EXISTS cache (id text, article text, param text, added text)");
			db.execute("CREATE TABLE IF NOT EXISTS feeds (id integer, title text, has_icon integer)");
			db.execute("CREATE TABLE IF NOT EXISTS articles (id integer, feed_id integer, title text, link text, guid text, updated text, content text, tags text, unread text, marked text, added text, comments text)");
			window.setTimeout("update_offline_data(0)", 100);

		}	
	
		cache_expire();

	} catch (e) {
		exception_error("init_gears", e);
	}
}


