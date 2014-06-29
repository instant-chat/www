module.exports = () => {
  return {
    restrict: 'E',
    template: require('./template.html'),
    controller: ['$rootScope', '$scope', '$sce', '$location', 'rtc', 'localMedia', ($rootScope, $scope, $sce, $location, rtc, localMedia) => {
      var localParticipant = {
        localParticipant: true,
        streams: []
      };

      $scope.participants = [localParticipant];

      localMedia.getStream()
        .then(stream => { 
          localParticipant.streams.push({
            stream, 
            src: $sce.trustAsResourceUrl(URL.createObjectURL(stream))
          });
          $scope.$apply();
        })
        .catch(error => alert(error));

      var signal = rtc.connectToSignal('https://' + $location.host());

      signal.on({
        'ready': handle => console.log('got handle', handle),

        'peer added': addPeer,
        'peer removed': peerRemoved,

        // 'peer ice_candidate': () => console.log('ICE Candidate Received'),
        'peer receive offer': () => console.log('Offer Received'),
        'peer receive answer': () => console.log('Answer Received'),
        'peer send answer': () => console.log('Answer Sent'),
        'peer signaling_state_change': (peer) => console.log('Signaling: ' + peer.connection.signalingState),
        'peer ice_connection_state_change': (peer) => {
          var state = peer.connection.iceConnectionState;
          console.log('ICE: ' + state);
        },

        'peer ice_candidate accepted': (peer, candidate) => console.log('candidate accepted', peer, candidate),

        'peer error set_local_description': (peer, error, offer) => console.log('peer error set_local_description', peer, error, offer),
        'peer error create offer': (peer, error) => console.log('peer error create offer', peer, error),
        'peer error ice_candidate': (peer, error, candidate) => console.log('peer error ice_candidate', peer, error, candidate),
        'peer error send answer': (peer, error, offer) => console.log('peer error send answer', peer, error, offer),
        'peer error set_remote_description': (peer, error, offer) => console.log('peer error set_remote_description', peer, error, offer)
      });

      $scope.currentRooms = signal.currentRooms;

      $rootScope.$on('$locationChangeSuccess', event => {
        var room = $location.path().replace(/^\//, '');

        $scope.currentRoom = room;

        signal.leaveRooms();
        signal.joinRoom(room);
      });

      function addPeer(peer) {
        console.log('peer added', peer);
        var participant = {
          peer,
          streams: []
        };

        $scope.participants.push(participant);

        localMedia.getStream()
          .then(
            stream => {
              peer.addLocalStream('local', stream);
              $scope.$apply();
            }
          ).catch(error => console.log('*** Error getting local media stream', error));

        if (peer.config.isExistingPeer) {
          peer.connect()
            .then(peer => 
              setTimeout(() => console.log('peer', peer), 0)
            ).catch(error => console.log(error));
        }

        peer.on('remoteStream added', stream => {
          console.log('got remote stream', stream);
          participant.streams.push({
            peer,
            src: $sce.trustAsResourceUrl(URL.createObjectURL(stream.stream))
          });
          $scope.$apply();
        });
      }

      function peerRemoved(peer) {
        _.remove($scope.participants, {peer: peer});
        $scope.$apply();
      }

    }]
  };
};