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
OpenspendingListify.year = 2015;
OpenspendingListify.period = 0;
OpenspendingListify.results = [];

OpenspendingListify.get_governments = function() {
  if (OpenspendingListify.governments_busy) {
    return;
  }

  OpenspendingListify.governments_busy = true;

  var governments_url = 'http://www.openspending.nl/api/v1/governments/?kind=' + OpenspendingListify.kind + '&limit=500&format=json';
  $.get(governments_url, function (data) {
    OpenspendingListify.governments_busy = false;
    OpenspendingListify.governments = data.objects;
    console.log('Got new governments for kind ' + OpenspendingListify.kind);
  });
};

OpenspendingListify.init = function() {
  console.log('hello!');
  $.get('http://www.openspending.nl/api/v1/aggregations/documents/?format=json&limit=0', function (data) {
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

    var components = ['size', 'order', 'kind', 'plan', 'direction', 'year'];
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
      OpenspendingListify[component] = new_val;
    }
    OpenspendingListify.period = (OpenspendingListify.plan == "budget") ? 0 : 5; // TODO: implement kwartalen

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

OpenspendingListify.get_all_labels = function(document_id, direction) {
  // get all the labels :)
  var labels_url = 'http://www.openspending.nl/api/v1/labels/?document_id=' + document_id + '&limit=500&direction=' + direction + '&format=json';
  $.get(labels_url, function (data) {
    console.log('got labels!');
    OpenspendingListify.labels = data.objects;
    $("#form-label input").typeahead('destroy').typeahead({ source: OpenspendingListify.labels.map(function (i) { return {id: i.code, name: i.label };}) });
    OpenspendingListify.labels_busy = false;
  });
};

OpenspendingListify.get_sample_document = function(kind, year, period, plan, direction) {
  if (OpenspendingListify.labels_busy) {
    return;
  }

  var docs_url = 'http://www.openspending.nl/api/v1/documents/?government__kind=' + kind + '&year=' + year + '&period=' + period + '&plan=' + plan + '&limit=1&format=json';
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
  var docs_url = 'http://www.openspending.nl/api/v1/documents/?government__kind=' + OpenspendingListify.kind + '&year=' + OpenspendingListify.year + '&period=' + OpenspendingListify.period + '&plan=' + OpenspendingListify.plan + '&limit=500&format=json';

  return $.get(docs_url);
};

OpenspendingListify.get_aggregated_entries = function(label) {
  // http://www.openspending.nl/api/v1/aggregations/entries/?type=spending&code_main=1&period=5&year=2012&direction=out&format=json
  var url = 'http://www.openspending.nl/api/v1/aggregations/entries/?type=' + OpenspendingListify.plan + '&year=' + OpenspendingListify.year;
  url = url + '&period=' + OpenspendingListify.period + '&code_' + label.type + '=' + label.code + '&direction=' + OpenspendingListify.direction + '&limit=1&format=json';

  return $.get(url);
};

OpenspendingListify.submit = function() {
 // http://www.openspending.nl/api/v1/documents/?government__kind=county&year=2014&period=5&plan=spending&format=json
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
    $('#status').html('<div class="alert alert-danger" role="alert">Er is geen label gevonden. Probeer het later nog een keer ...</div>');
    return;
  }

  $('#status').html('<div class="alert alert-info" role="alert">Data wordt verzameld ...</div>');

  $.when(
    OpenspendingListify.get_all_documents(),
    OpenspendingListify.get_aggregated_entries(selected_label[0])
  ).then(function (docs_result, entries_result) {
    $('#status').html('<div class="alert alert-success" role="alert">De resultaten zijn berekent ...</div>');
    var documents = {};
    $.each(docs_result[0].objects, function (idx, item) {
      documents[item.id] = item;
    });
    OpenspendingListify.results = [];
    $.each(entries_result[0].facets.document.terms, function (idx, t) {
      OpenspendingListify.results.push({
        document: documents[t.term],
        government: documents[t.term].government,
        total: t.total
      });
    });
    $('#status').empty();
    OpenspendingListify.show_results();
  });
};

OpenspendingListify.show_results = function() {
  var max_total = Math.max.apply(null, OpenspendingListify.results.map(function (r) { return r.total; }));

  $('#results').empty();

  $.each(OpenspendingListify.results.sort(function (a,b) { return b.total - a.total; }), function (idx, item) {
    var output = '<div class="result row">';
    var total_formatted = accounting.formatMoney(item.total, "€", 2, ".", ",");
    output += '  <h3>' + (idx+1) + '. ' + item.government.name + ' : ' + total_formatted + '</h3>';
    var pct = 0;
    if (item.total > 0) {
      pct = (item.total * 100.0) / max_total;
    }
    output += '  <div class="progress">';
    output += '    <div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100" style="width: '+ pct + '%">';
    output += '      <span class="sr-only">' + pct + '% Complete</span>';
    output += '    </div>';
    output += '  </div>';
    output += '</div>';
    $('#results').append($(output));
  });
};

$(document).ready(function() {
  OpenspendingListify.init();
});
