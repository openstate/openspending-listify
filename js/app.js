OpenspendingListify = window.OpenspendingListify || {};
OpenspendingListify.labels = window.OpenspendingListify.labels || [];
OpenspendingListify.labels_busy = false;
OpenspendingListify.governments = window.OpenspendingListify.governments || [];
OpenspendingListify.governments_busy = false;
OpenspendingListify.size = 10;
OpenspendingListify.order = "desc";
OpenspendingListify.kind = "county";
OpenspendingListify.plan = "budget";
OpenspendingListify.direction = "out";
OpenspendingListify.year = 2018;
OpenspendingListify.period = 0;
OpenspendingListify.results = [];
OpenspendingListify.normalisation = "currency";
OpenspendingListify.selected_label = undefined;

OpenspendingListify.get_governments = function() {
  if (OpenspendingListify.governments_busy) {
    return;
  }

  OpenspendingListify.governments_busy = true;

  var governments_url = 'https://openspending.nl/api/v1/governments/?kind=' + OpenspendingListify.kind + '&limit=500&format=json';
  $.get(governments_url, function (data) {
    OpenspendingListify.governments_busy = false;
    OpenspendingListify.governments = data.objects;
    console.log('Got new governments for kind ' + OpenspendingListify.kind);
  });
};

OpenspendingListify.init = function() {
  console.log('hello!');
  $.get('https://openspending.nl/api/v1/aggregations/documents/?format=json&limit=0', function (data) {
    console.log('got aggregated document data!');
    OpenspendingListify.years = data.facets.years.terms.map(function (t) {
      return parseInt(t.term);
    }).sort();

    $.each(OpenspendingListify.years, function (idx, item) {
      $('#form-year').append($(
        '<div class="radio"><label><input type="radio" name="year" id="options-year-' + item + '" value="' + item + '">'+ item + '</label></div>'
      ));
    });

    $('#form-year .radio input:last').attr('checked', 'checked');
  });

  $('.modal').on('hide.bs.modal', function (e) {
    // do something...
    $('#status').empty();
    console.log('hid a modal!');

    var components = ['size', 'order', 'kind', 'plan', 'direction', 'year', 'normalisation', 'period'];
    var dirty = false;
    var refetch_governments = false;
    for (idx in components) {
      var component = components[idx];
      $('#choice-' + component).text($('#form-' + component + ' input:checked').parent().text());
      var new_val = $('#form-' + component + ' input:checked').val();
      if (OpenspendingListify[component] != new_val) {
        console.log('Selection property changed from ' + OpenspendingListify[component] + ' to ' + new_val);
        dirty = true;
        if (component == 'kind') {
          refetch_governments = true;
        }
      }

      if (component == 'period') {
        OpenspendingListify[component] = parseInt(new_val);
      } else {
        OpenspendingListify[component] = new_val;
      }
    }

    if ((OpenspendingListify.plan == "spending") && (OpenspendingListify.period == 0)) {
      OpenspendingListify.period = 5;
    }

    if (refetch_governments) {
      OpenspendingListify.get_governments();
    }

    if (dirty) {
      OpenspendingListify.get_sample_document(
        OpenspendingListify.kind, OpenspendingListify.year,
        OpenspendingListify.period, OpenspendingListify.plan,
        OpenspendingListify.direction);
    }
  });

  $('#btn-submit').on('click', function (e) {
    OpenspendingListify.submit();
    e.preventDefault();
    return false;
  });

  OpenspendingListify.get_governments();
  OpenspendingListify.get_sample_document(
    OpenspendingListify.kind, OpenspendingListify.year,
    OpenspendingListify.period, OpenspendingListify.plan,
    OpenspendingListify.direction);
};

OpenspendingListify.make_full_urls_for_labels = function() {
  var main2slug = {};
  main_functions = OpenspendingListify.labels.filter(function (l) { return l.type == "main";});
  for (idx in main_functions) {
    main2slug[main_functions[idx]['code']] = main_functions[idx]['slug'];
  }

  $.each(OpenspendingListify.labels, function (idx, item) {
    var full_url;
    if (item.type == "main") {
      full_url = 'hoofdfuncties/' + item.slug + '/functies/';
    } else if (item.type == "sub") {
      if (item.code[0] == 'A') {
        full_url = undefined;
      } else {
        full_url = 'hoofdfuncties/' + main2slug[item.code[0]] + '/functies/' + item.slug + '/categorieen/';
      }
    } else {
      full_url = 'categorieen/' + item.slug + '/hoofdfuncties/';
    }
    item.full_url = full_url;
  });
};


OpenspendingListify.get_all_labels = function(document_id, direction) {
  // get all the labels :)
  var labels_url = 'https://openspending.nl/api/v1/labels/?document_id=' + document_id + '&limit=500&format=json';
  $.get(labels_url, function (data) {
    console.log('got labels!');
    OpenspendingListify.labels = data.objects.filter(function (l) { return (l.direction == direction);});
    OpenspendingListify.make_full_urls_for_labels();
    $("#form-label input").typeahead('destroy').typeahead({ source: OpenspendingListify.labels.filter(function (l) { return l.code != ''; }).map(function (i) { return {id: i.code, name: i.label };}) });
    OpenspendingListify.labels_busy = false;
  });
};

OpenspendingListify.get_sample_document = function(kind, year, period, plan, direction) {
  if (OpenspendingListify.labels_busy) {
    return;
  }

  var docs_url = 'https://openspending.nl/api/v1/documents/?government__kind=' + kind + '&year=' + year + '&period=' + period + '&plan=' + plan + '&limit=1&format=json';
  OpenspendingListify.labels_busy = true;
  console.log(docs_url);
  $.get(docs_url, function (data) {
    console.log('got data:');
    console.dir(data);

    if (data.objects.length > 0) {
      OpenspendingListify.get_all_labels(data.objects[0].id, direction);
    } else {
      OpenspendingListify.labels_busy = false;
      OpenspendingListify.labels = [];
      $("#form-label input").typeahead('destroy').typeahead({ source: []});
      $('#status').html('<div class="alert alert-danger" role="alert">Er zijn geen labels gevonden. Probeer het later nog een keer ...</div>');
    }
  });
};

OpenspendingListify.get_all_documents = function() {
  var docs_url = 'https://openspending.nl/api/v1/documents/?government__kind=' + OpenspendingListify.kind + '&year=' + OpenspendingListify.year + '&period=' + OpenspendingListify.period + '&plan=' + OpenspendingListify.plan + '&limit=500&format=json';

  return $.get(docs_url);
};

OpenspendingListify.get_aggregated_entries = function(label) {
  // https://openspending.nl/api/v1/aggregations/entries/?type=spending&code_main=1&period=5&year=2012&direction=out&format=json
  var url = 'https://openspending.nl/api/v1/aggregations/entries/?type=' + OpenspendingListify.plan + '&year=' + OpenspendingListify.year;
  url = url + '&period=' + OpenspendingListify.period + '&code_' + label.type + '=' + label.code + '&direction=' + OpenspendingListify.direction + '&limit=1&format=json';
  console.log(url);
  return $.get(url);
};

OpenspendingListify.submit = function() {
 // https://openspending.nl/api/v1/documents/?government__kind=county&year=2014&period=5&plan=spending&format=json
  console.log('form submitted!');

  $('#status').empty();

  if (OpenspendingListify.labels_busy || OpenspendingListify.governments_busy) {
    $('#status').html('<div class="alert alert-danger" role="alert">Er zijn nog dingen aan het laden. Probeer het later nog een keer ...</div>');
    return;
  }

  if ($('#form-label input').val() == '') {
    $('#status').html('<div class="alert alert-danger" role="alert">Er is geen label geselecteerd. Probeer het later nog een keer ...</div>');
    return;
  }
  var selected_label = OpenspendingListify.labels.filter(function (l) { return (l.label == $('#form-label input').val()); });

  if (selected_label.length != 1) {
    OpenspendingListify.selected_label = undefined;
    $('#status').html('<div class="alert alert-danger" role="alert">Er is geen label gevonden. Probeer het later nog een keer ...</div>');
    return;
  }

  OpenspendingListify.selected_label = selected_label[0];
  $('#status').html('<div class="alert alert-info" role="alert">Data wordt verzameld ...</div>');

  $.when(
    OpenspendingListify.get_all_documents(),
    OpenspendingListify.get_aggregated_entries(selected_label[0])
  ).then(function (docs_result, entries_result) {
    console.log('query results:');
    console.dir(docs_result);
    console.dir(entries_result);
    $('#status').html('<div class="alert alert-success" role="alert">De resultaten zijn berekend ...</div>');
    var documents = {};
    $.each(docs_result[0].objects, function (idx, item) {
      documents[item.id] = item;
    });
    OpenspendingListify.results = [];
    $.each(entries_result[0].facets.document.terms, function (idx, t) {
      if (typeof(documents[t.term]) !== 'undefined') {
        OpenspendingListify.results.push({
          document: documents[t.term],
          government: documents[t.term].government,
          total: t.total,
          factor: OpenspendingListify.get_metric_for(documents[t.term].government, OpenspendingListify.normalisation, OpenspendingListify.year)
        });
      };
    });
    $('#status').empty();
    OpenspendingListify.show_results();
    OpenspendingListify.prepare_download();
  });
};

OpenspendingListify.get_metric_for = function(government, metric_type, year) {
  var filtered_results = government.metrics.filter(function (m) { return ((m.metric == metric_type) && (m.year <= year)); });
  return filtered_results[0].factor;
};

OpenspendingListify.get_url_for_item = function(item) {
  var plan2nl = {
    budget: 'begroting',
    spending: 'realisatie'
  };
  var direction2nl = {
    in: 'baten',
    out: 'lasten'
  };
  var url = "https://openspending.nl/" + item.government.slug + '/';
  url += plan2nl[OpenspendingListify.plan] + '/' + OpenspendingListify.year + '-' + OpenspendingListify.period + '/';
  url += direction2nl[OpenspendingListify.direction] + '/' + OpenspendingListify.selected_label.full_url;
  return url;
};

OpenspendingListify.show_results = function() {
  var max_total = Math.max.apply(null, OpenspendingListify.results.map(function (r) { return (r.total / r.factor * 1.0); }));

  $('#results').empty();

  var sorted_results = OpenspendingListify.results.sort(function (a,b) { return ((b.total / (b.factor * 1.0)) - (a.total / (a.factor * 1.0))); });
  if (OpenspendingListify.order == 'asc') {
    sorted_results = sorted_results.reverse();
  }
  $.each(sorted_results.slice(0, OpenspendingListify.size), function (idx, item) {
    var output = '<div class="result row">';
    var normalised_total = item.total / (item.factor * 1.0);
    var total_formatted = accounting.formatMoney(normalised_total, "€", 2, ".", ",");
    var openspending_url = OpenspendingListify.get_url_for_item(item);
    output += '  <h4><a href="' + openspending_url + '" target="_blank">' + (idx+1) + '. ' + item.government.name + ' : ' + total_formatted + ' <span class="glyphicon glyphicon-new-window" aria-hidden="true"></span></a></h4>';
    var pct = 0;
    if (item.total > 0) {
      pct = ((item.total / item.factor * 1.0) * 100.0) / max_total;
    }
    output += '  <div class="progress">';
    output += '    <div class="progress-bar" role="progressbar" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100" style="width: '+ pct + '%">';
    output += '      <span class="sr-only">' + pct + '% Complete</span>';
    output += '    </div>';
    output += '  </div>';
    output += '</div>';
    $('#results').append($(output));
  });
};


OpenspendingListify.prepare_download = function() {
  var max_total = Math.max.apply(null, OpenspendingListify.results.map(function (r) { return (r.total / r.factor * 1.0); }));
  var sorted_results = OpenspendingListify.results.sort(function (a,b) { return ((b.total / (b.factor * 1.0)) - (a.total / (a.factor * 1.0))); });
  if (OpenspendingListify.order == 'asc') {
    sorted_results = sorted_results.reverse();
  }
  var rows = [['plek', 'naam', 'bedrag', 'percentage'].join(';')];
  $.each(sorted_results, function (idx, item) {
    var normalised_total = item.total / (item.factor * 1.0);
    var pct = 0;
    if (item.total > 0) {
      pct = ((item.total / item.factor * 1.0) * 100.0) / max_total;
    }
    rows.push([idx+1, item.government.name, normalised_total, pct].join(';'));
  });
  $('#btn-download').attr(
    'href', 'data:attachment/csv,' + encodeURIComponent(rows.join("\n"))
  ).attr('target', '_blank').attr('download', 'data.csv').removeClass('disabled');
};

$(document).ready(function() {
  OpenspendingListify.init();
});
