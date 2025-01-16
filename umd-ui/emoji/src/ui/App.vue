<template>
  <div>
    <h1>UI Test for Emoticons</h1>
    <div class="row" id="picker"></div>
    <div
      contenteditable="true"
      class="row"
      id="test"
      style="width: 500px;height: 40px;border: 1px solid;"
    ></div>
    <label>origin</label>
    <div id="origin">Hello, :D this is a test 😊</div>
    <label>encoded</label>
    <div id="encoded"></div>
    <label>decoded</label>
    <div id="decoded"></div>
  </div>
</template>

<script>
import {
  initEmoji,
  toEmoji,
  encodeEmoji,
  decodeEmoji,
  EmojiType
} from "@/lib/main"; // Sử dụng component từ thư viện

export default {
  name: "SampleApp",
  data() {
    return {
      popup: null
    };
  },
  created() {},
  mounted() {
    var contentEditable = document.querySelector("#test");
    var container = document.querySelector("#picker");

    initEmoji(
      container,
      contentEditable,
      function(e) {
        console.log(e);
      },
      null,
      null,
      EmojiType.Facebook,
      "vi"
    );

    let originText = document.querySelector("#origin").innerHTML;
    document.querySelector("#encoded").innerHTML = encodeEmoji(
      toEmoji(originText)
    );
    document.querySelector("#decoded").innerHTML = decodeEmoji(
      document.querySelector("#encoded").innerHTML
    );
  },
  computed: {},
  methods: {}
};
</script>
