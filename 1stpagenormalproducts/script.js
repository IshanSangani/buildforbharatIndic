$(document).ready(function() {
  $("#voice-search-btn").click(function() {
    startVoiceSearch();
  });

  $("#image-search-input").change(function(event) {
    performImageSearch(event);
  });

  $("#search-btn").click(function() {
    performTextSearch();
  });
});

function startVoiceSearch() {
  // Assuming the browser supports the Web Speech API
  var recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = $("#language-select").val(); // Use the selected language
  recognition.onresult = function(event) {
    var transcript = event.results[0][0].transcript;
    $("#search-input").val(transcript);
    performTextSearch(); // Automatically perform the search after voice input
  };
  recognition.start();
}

function performImageSearch(event) {
  var file = event.target.files[0];
  if (file) {
    // Send the file to the server for OCR and translation
    console.log("File for image search selected:", file.name);
  }
}

function performTextSearch() {
  var query = $("#search-input").val();
  var language = $("#language-select").val();
  // Send the text to the server for translation and search
  console.log("Search for:", query, "in language:", language);
}
