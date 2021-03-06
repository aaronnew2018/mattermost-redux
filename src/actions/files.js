// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
// @flow

import {batchActions} from 'redux-batched-actions';

import {Client4} from 'client';
import {FileTypes} from 'action_types';
import {logError} from './errors';
import {bindClientFunc, forceLogoutIfNecessary} from './helpers';
import type {DispatchFunc, GetStateFunc} from '../types/actions';

export function getFilesForPost(postId: string) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch({type: FileTypes.FETCH_FILES_FOR_POST_REQUEST, data: {}}, getState);
        let files;

        try {
            files = await Client4.getFileInfosForPost(postId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                {type: FileTypes.FETCH_FILES_FOR_POST_FAILURE, error},
                logError(error),
            ]), getState);
            return {error};
        }

        dispatch(batchActions([
            {
                type: FileTypes.RECEIVED_FILES_FOR_POST,
                data: files,
                postId,
            },
            {
                type: FileTypes.FETCH_FILES_FOR_POST_SUCCESS,
            },
        ]), getState);

        return {data: true};
    };
}

export function getMissingFilesForPost(postId: string) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const {fileIdsByPostId} = getState().entities.files;

        let posts = [];
        if (!fileIdsByPostId[postId]) {
            posts = await getFilesForPost(postId)(dispatch, getState);
        }

        return {data: posts};
    };
}

export function uploadFile(channelId: string, rootId: string, clientIds: Array<String>,
    fileFormData: File, formBoundary: string) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch({type: FileTypes.UPLOAD_FILES_REQUEST, data: {}}, getState);

        let files;
        try {
            files = await Client4.uploadFile(fileFormData, formBoundary);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            const failure = {
                type: FileTypes.UPLOAD_FILES_FAILURE,
                clientIds,
                channelId,
                rootId,
                error,
            };

            dispatch(batchActions([failure, logError(error)]), getState);
            return {error};
        }

        const data = files.file_infos.map((file, index) => {
            return {
                ...file,
                clientId: files.client_ids[index],
            };
        });

        dispatch(batchActions([
            {
                type: FileTypes.RECEIVED_UPLOAD_FILES,
                data,
                channelId,
                rootId,
            },
            {
                type: FileTypes.UPLOAD_FILES_SUCCESS,
            },
        ]), getState);

        return {data: files};
    };
}

export function getFilePublicLink(fileId: string) {
    return bindClientFunc(
        Client4.getFilePublicLink,
        FileTypes.GET_FILE_PUBLIC_LINK_REQUEST,
        [FileTypes.RECEIVED_FILE_PUBLIC_LINK, FileTypes.GET_FILE_PUBLIC_LINK_SUCCESS],
        FileTypes.GET_FILE_PUBLIC_LINK_FAILURE,
        fileId
    );
}
