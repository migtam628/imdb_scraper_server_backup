var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var axios = require('axios');
var fetch = require("node-fetch");
var app = express();
var Xtorrent = require("xtorrent");
var yifysubtitles = require("yifysubtitles");

app.get("/subtitle-search", async (req, res) => {
  let id = req.query.id;
  let language = req.query.lang;
  console.log({ id, language });
  const results = await yifysubtitles(id, {
    path: "/tmp/",
    langs: [language],
  }).then((res) => {
    console.log(res);
    return res;
  });

  let shortLang = results[0].langShort;
  let lang = results[0].lang;
  let path = results[0].path;
  console.log(path);
  fs.readFile(path, { encoding: "utf-8" }, (err, data) => {
    if (!err) {
      res.writeHead(200, { "Content-Type": "text/vtt" });
      res.write(data);
      res.end();
    } else {
      res.writeHead(404, {"Content-Type": "text/vtt"});
      res.write(err);
      res.end;
    }
  });
});

app.get('/torrent-search', (req, res) => {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.set({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    })
    let id = req.query.imdb_id
    axios({
        method: 'GET',
        url: 'https://yts-am-torrent.p.rapidapi.com/list_movies.json',
        headers: {
            'content-type': 'application/octet-stream',
            'x-rapidapi-host': 'yts-am-torrent.p.rapidapi.com',
            'x-rapidapi-key': 'e3f3918094mshd9ac32aa0744d2fp141a50jsnbeafa4d56abe'
        },
        params: {
            query_term: id
        }
    })
        .then(response => {
            if (response.data) {
                res.json(response.data)

            } else {
                res.send(response)
            }
        })
        .catch(error => {
            console.log(error)
            res.send(error)
        })
})

global.torrent = {};
global.result = {};
global.magnet = "";

app.get("/xtorrent",(req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  let title = req.query.title;
  let episode = req.query.e;
  let season = req.query.s;
  let quality = req.query.quality;
  let type = req.query.type;

  let query =
    (title ? title + " " : "") +
    (season ? "s" + season : "") +
    (episode ? "e" + episode + " " : "") +
    (quality ? quality : "");

  if (type === "Movies") {
    Xtorrent.search({ query: query, category: type }).then((Data) => {
      Xtorrent.info(Data.domain + Data.torrents[0].href).then((data) => {
        let globalmagnet = data.download.magnet;
        let globaltorrent = Data;
        let globalresult = Data.domain + Data.torrents[0].href;
        res.json({
          status: "ok",
          status_message: "Query was successful",
          data: {
            main_result: {
              query: query,
              torrent_url: globalresult,
              magnet: globalmagnet,
            },
            all_torrents: globaltorrent,
          },
        });
      });
    });
  } else if (type === "TV") {
    Xtorrent.search({ query: query, category: type }).then((Data) => {
      Xtorrent.info(Data.domain + Data.torrents[0].href).then((data) => {
        let globalmagnet = data.download.magnet;
        let globaltorrent = Data;
        let globalresult = Data.domain + Data.torrents[0].href;
        res.json({
          status: "ok",
          status_message: "Query was successful",
          data: {
            main_result: {
              query: query,
              torrent_url: globalresult,
              magnet: globalmagnet,
            },
            all_torrents: globaltorrent,
          },
        });
      });
      //   res.json({ query: query, tv_results: Data })
    });
  } else if (type === "Documentaries") {
    Xtorrent.search({ query: query, category: type }).then((Data) => {
      console.log(Data);
      res.json({
        status: "ok",
        status_message: "Query was successful",
        data: { query: query, docu_results: Data },
      });
    });
    res.json({
      status: "ok",
      status_message: "Query was successful",
      data: { query: query },
    });
  } else if (type === "Anime") {
    Xtorrent.search({ query: query, category: type }).then((Data) => {
      console.log(Data);
      res.json({
        status: "ok",
        status_message: "Query was successful",
        data: {
          status: "ok",
          status_message: "Query was successful",
          data: { query: query, anime_results: Data },
        },
      });
    });
    res.json({
      status: "ok",
      status_message: "Query was successful",
      data: { query: query },
    });
  }
});

app.get('/imdb_scraper', function (req, res) {
    var id = req.query.imdb_id
    var title = req.query.title
    var url1 = `https://www.imdb.com/title/${id}`;
    var url = `https://www.imdb.com/find?ref_=nv_sr_fn&q=${id}&s=all`;
    request(url, function (error, response, html) {
        if (!error) {
            var $ = cheerio.load(html);

            var json = {
                title: "",
                release_date: "",
                rating: "",
                runtime: "",
                keywords: "",
                country: "",
                language: "",
                cast: [],
                plot: "",
                storyline: "",
                filming_locations: "",
                poster: "",
                backdrop: ""
            };

            $('.title_wrapper').filter(() => {
                var data = $(this);
                title = data.children().first().text().trim();
                release = data.children().last().children().last().text().trim();
                json.title = title;
                json.release_date = release;
            })

            $('.ratingValue').filter(() => {
                var data = $(this);
                rating = data.text().trim();
                json.rating = rating;
            })

            $('time').filter(() => {
                var data = $(this);
                runtime = data.text().trim();
                json.runtime = runtime;
            })

            $('.slate').filter(() => {
                var data = $(this);
                backdrop = data.children().first().children().first().attr('src')
                json.backdrop = backdrop;
            })

            $('.poster').filter(() => {
                var data = $(this);
                poster = data.children().first().children().first().attr('src')
                json.poster = poster;
            })

            $('#name-poster').filter(() => {
                var data = $(this);
                poster = data.children().first().children().first().attr('src')
                json.poster = poster;
            })

            $('.summary_text').filter(() => {
                var data = $(this);
                plot = data.text().trim();
                json.plot = plot;
            })

            $('.cast_list').filter(() => {
                var data = $(this);
                cast = data.children().first().text().trim();
                newCast = cast.replace(/[\n]+/g, "").trim()
                newCast1 = newCast.replace('Cast overview, first billed only: ', "").trim()
                json.cast = newCast1.replace(/['                                ...                              ']+/g, " ").trim();
            })

            $('#knownfor').filter(() => {
                var data = $(this);
                cast = data.children().first().text().trim();
                newCast = cast.replace(/[\n]+/g, "").trim()
                newCast1 = newCast.replace('Cast overview, first billed only: ', "").trim()
                json.cast = newCast1.replace(/['                                ...                              ']+/g, " ").trim();
            })

            $('.article#titleStoryLine').filter(() => {
                var data = $(this);
                storyline = $('.inline.canwrap').children('p').children('span').text().trim()
                keywords = $('.see-more.inline.canwrap').children('a').text()
                json.storyline = storyline.trim()
                json.keywords = keywords.trim().replace(/[" "]+/g, ", ")
            })

            $('.article#titleDetails').filter(() => {
                var data = $(this);
                lo = $('div.txt-block').eq(8).text();
                loc = lo.replace(/[\n]+/g, "");
                loca = loc.replace('Filming Locations:', "");
                locat = loca.replace("»", "");
                json.filming_locations = locat.replace("See more", "").trim();

                l = $('div.txt-block').eq(5).text();
                la = l.replace(/[\n]+/g, "");
                lan = la.replace('Language:', "");
                lang = lan.replace(/['            |        ']+/g, ", ").trim();
                langu = lang.replace('|', "")
                json.language = langu.substring(0, langu.length - 1).trim();

                c = $('div.txt-block').eq(4).text();
                co = c.replace(/[\n]+/g, "");
                cou = co.replace('Country:', "");
                coun = cou.replace("»", "");
                json.country = coun.replace("See more", "").trim();

            })

        }

        // fs.writeFile(`${id}.json`, JSON.stringify(json, null, 4), function(err) {
        //     // fs.writeFile(`/Users/migtamrod/Desktop/${id}.json`, JSON.stringify(json, null, 4), function(err) {
        //     if (!err) {
        //         console.log(`File successfully written! - Check your project directory for the ${id}.json file`);
        //     } else {
        //         console.log({ err })
        //     }
        // })

        res.json(JSON.parse(JSON.stringify(json)))
    })
})

app.listen('3000');
exports = module.exports = app;
