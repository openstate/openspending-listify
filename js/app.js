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
  })
};

$(document).ready(function() {
  OpenspendingListify.init();
});
