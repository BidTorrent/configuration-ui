<!DOCTYPE html>
<head>
    <script type="text/javascript" src="//www.gstatic.com/authtoolkit/js/gitkit.js"></script>
    <link type="text/css" rel="stylesheet" href="//www.gstatic.com/authtoolkit/css/gitkit.css" />
    <script type="text/javascript">
      var config = {
          apiKey: 'AIzaSyA1deE1SBJN46W03TyX8uHwyQXWWRRhVoU',
          signInSuccessUrl: '../publisher',
          idps: ["google", "yahoo", "facebook"],
          oobActionUrl: '/',
          siteName: 'this site'
      };
      // The HTTP POST body should be escaped by the server to prevent XSS
      window.google.identitytoolkit.start(
          '#gitkitWidgetDiv', // accepts any CSS selector
          config,
          JSON.parse('<?php echo json_encode(file_get_contents("php://input")); ?>'));
    </script>
</head>
<body>
    <div id="gitkitWidgetDiv"></div>
</body>
</html>