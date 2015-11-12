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

  // TODO: make it return one document, since that is all we need anyway ...
  var docs_url = 'http://www.openspending.nl/api/v1/documents/?government__kind=' + kind + '&year=' + year + '&period=' + period + '&plan=' + plan + '&format=json';
  OpenspendingListify.labels_busy = true;
  console.log(docs_url);
  $.get(docs_url, function (data) {
    console.log('got data:');
    console.dir(data);

    if (data.objects.length > 0) {
      OpenspendingListify.get_all_labels(data.objects[0].id, direction);
    } else {
      OpenspendingListify.labels = [];
      $("#form-label input").typeahead('destroy').typeahead({ source: []});
    }
  });
};

OpenspendingListify.get_totals = function() {
  // http://www.openspending.nl/api/v1/aggregations/entries/?type=spending&code_main=1&period=5&year=2012&direction=out&format=json
};

OpenspendingListify.submit = function() {
 // http://www.openspending.nl/api/v1/documents/?government__kind=county&year=2014&period=5&plan=spending&format=json
  console.log('form submitted!');
};

$(document).ready(function() {
  OpenspendingListify.init();
});
