OpenspendingListify = window.OpenspendingListify || {};

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

    $('#choice-size').text($('#form-size input:checked').parent().text());
    $('#choice-order').text($('#form-order input:checked').parent().text());
    $('#choice-kind').text($('#form-kind input:checked').parent().text());
    $('#choice-plan').text($('#form-plan input:checked').parent().text());
    $('#choice-direction').text($('#form-direction input:checked').parent().text());
    $('#choice-year').text($('#form-year input:checked').parent().text());
  });

  $('#btn-submit').on('click', function (e) {
    OpenspendingListify.submit();
    e.preventDefault();
    return false;
  });
};

OpenspendingListify.get_sample_document = function(kind, year, period, plan) {
  // TODO: make it return one document, since that is all we need anyway ...
  var docs_url = 'http://www.openspending.nl/api/v1/documents/?government__kind=' + kind + '&year=' + year + '&period=' + period + '&plan=' + plan + '&format=json'
  console.log(docs_url);
  $.get(docs_url, function (data) {
    console.log('got data:');
    console.dir(data);
  });
};

OpenspendingListify.submit = function() {
 // http://www.openspending.nl/api/v1/documents/?government__kind=county&year=2014&period=5&plan=spending&format=json
  console.log('form submitted!');
  var size = $('#form-size input:checked').val();
  var order = $('#form-order input:checked').val();
  var kind = $('#form-kind input:checked').val();
  var plan = $('#form-plan input:checked').val();
  var direction = $('#form-direction input:checked').val();
  var year = $('#form-year input:checked').val();
  var period = (plan == "budget") ? 0 : 5; // TODO: implement kwartalen
  OpenspendingListify.get_sample_document(kind, year, period, plan);
};

$(document).ready(function() {
  OpenspendingListify.init();
});
